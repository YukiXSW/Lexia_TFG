from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

from config import config

TEST_QUESTIONS = [
    "Me han despedido del trabajo después de 5 años. ¿Qué indemnización me corresponde?",
    "Mi vecino hace ruido todas las noches. ¿Qué puedo hacer legalmente?",
    "Quiero alquilar mi piso. ¿Cuánto dura el contrato y qué pasa si quiero recuperarlo antes?",
    "Me han puesto una multa que no creo justa. ¿Cómo puedo recurrirla?",
    "¿Cuántos años de cárcel son por homicidio según el Código Penal?",
    "Me deben dinero de un préstamo personal. ¿Hasta cuándo puedo reclamarlo?",
    "Una empresa está usando mis datos personales sin permiso. ¿Es legal?",
    "¿Cómo solicito el derecho al olvido en internet?",
    "He tenido un accidente de tráfico. ¿Tengo derecho a indemnización?",
    "Mi arrendador no ha devuelto la fianza. ¿Qué hago?",
]


def load_model():
    print(f"Cargando modelo base: {config.base_model}")
    tokenizer = AutoTokenizer.from_pretrained(config.adapter_path)
    model = AutoModelForCausalLM.from_pretrained(
        config.base_model,
        device_map="auto",
        torch_dtype="auto",
    )
    print(f"Cargando LoRA adapter desde: {config.adapter_path}")
    model = PeftModel.from_pretrained(model, config.adapter_path)
    model.eval()
    return model, tokenizer


def ask(model, tokenizer, question: str, system_prompt: str | None = None) -> str:
    if system_prompt is None:
        system_prompt = config.system_prompt

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question},
    ]

    prompt = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=512,
        temperature=0.3,
        do_sample=False,
        pad_token_id=tokenizer.pad_token_id,
        eos_token_id=tokenizer.eos_token_id,
    )

    response = outputs[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(response, skip_special_tokens=True)


def main():
    import torch

    print("=" * 60)
    print("Lexia - Test del Modelo Fine-tuneado")
    print("=" * 60)

    model, tokenizer = load_model()

    print(f"\nProbando {len(TEST_QUESTIONS)} preguntas...\n")

    for i, question in enumerate(TEST_QUESTIONS, 1):
        print(f"[{i}/{len(TEST_QUESTIONS)}] P: {question}")
        try:
            answer = ask(model, tokenizer, question)
            print(f"  R: {answer[:300]}...")
        except Exception as e:
            print(f"  ERROR: {e}")
        print("-" * 60)

    print("\nPruebas completadas.")


if __name__ == "__main__":
    main()
