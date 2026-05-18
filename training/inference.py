import asyncio
import json
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

import torch
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer, TextStreamer
from peft import PeftModel

from config import config


class Message(BaseModel):
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    temperature: float = 0.3
    max_tokens: int = 2048
    stream: bool = True


class ChatResponse(BaseModel):
    content: str


model: Optional[AutoModelForCausalLM] = None
tokenizer: Optional[AutoTokenizer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, tokenizer
    print(f"Cargando modelo fine-tuneado desde: {config.adapter_path}")
    try:
        tokenizer = AutoTokenizer.from_pretrained(config.adapter_path)
        base_model = AutoModelForCausalLM.from_pretrained(
            config.base_model,
            device_map="auto",
            torch_dtype=torch.float16,
        )
        model = PeftModel.from_pretrained(base_model, config.adapter_path)
        model.eval()
        print("Modelo cargado correctamente")
    except Exception as e:
        print(f"Error cargando modelo: {e}")
        print("Intentando cargar modelo fusionado...")
        try:
            model = AutoModelForCausalLM.from_pretrained(
                config.merged_model_path,
                device_map="auto",
                torch_dtype=torch.float16,
            )
            tokenizer = AutoTokenizer.from_pretrained(config.merged_model_path)
            print("Modelo fusionado cargado correctamente")
        except Exception as e2:
            print(f"Error cargando modelo fusionado: {e2}")
            model = None
            tokenizer = None
    yield
    model = None
    tokenizer = None


app = FastAPI(title="Lexia - Legal Assistant Inference", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_prompt(messages: list[Message]) -> str:
    if tokenizer is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")

    system = None
    chat_messages = []
    for m in messages:
        if m.role == "system":
            system = m.content
        else:
            chat_messages.append({"role": m.role, "content": m.content})

    if system:
        formatted = tokenizer.apply_chat_template(
            [{"role": "system", "content": system}] + chat_messages,
            tokenize=False,
            add_generation_prompt=True,
        )
    else:
        formatted = tokenizer.apply_chat_template(
            chat_messages,
            tokenize=False,
            add_generation_prompt=True,
        )
    return formatted


async def generate_stream(prompt: str, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        for _ in range(max_tokens // 10):
            outputs = model.generate(
                **inputs,
                max_new_tokens=10,
                temperature=temperature,
                do_sample=temperature > 0,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
                output_scores=False,
                return_dict_in_generate=True,
            )
            new_tokens = outputs.sequences[0][inputs["input_ids"].shape[1]:]
            if new_tokens[-1] == tokenizer.eos_token_id:
                decoded = tokenizer.decode(new_tokens[:-1], skip_special_tokens=True)
                if decoded:
                    yield f"data: {json.dumps({'content': decoded, 'done': True})}\n\n"
                else:
                    yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
                return

            decoded = tokenizer.decode(new_tokens, skip_special_tokens=True)
            if decoded:
                yield f"data: {json.dumps({'content': decoded, 'done': False})}\n\n"

            inputs = {
                "input_ids": outputs.sequences,
                "attention_mask": torch.ones_like(outputs.sequences),
            }

    yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"


def generate_sync(prompt: str, temperature: float, max_tokens: int) -> str:
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    generated = outputs[0][inputs["input_ids"].shape[1]:]
    response = tokenizer.decode(generated, skip_special_tokens=True)
    return response


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    if model is None or tokenizer is None:
        raise HTTPException(
            status_code=503,
            detail="Modelo no disponible. Asegúrate de haber ejecutado train.py primero.",
        )

    prompt = build_prompt(request.messages)

    if request.stream:
        return StreamingResponse(
            generate_stream(prompt, request.temperature, request.max_tokens),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )
    else:
        response = generate_sync(prompt, request.temperature, request.max_tokens)
        return {"choices": [{"message": {"role": "assistant", "content": response}}]}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "adapter_path": str(config.adapter_path),
    }


if __name__ == "__main__":
    print("=" * 60)
    print("Lexia - Servidor de Inferencia (FastAPI)")
    print("=" * 60)
    print(f"Host: {config.inference_host}:{config.inference_port}")
    print(f"Adapter: {config.adapter_path}")
    print(f"Streaming: {config.use_streaming}")
    print()
    uvicorn.run(app, host=config.inference_host, port=config.inference_port)
