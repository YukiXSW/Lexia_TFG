import json
import math
import os
import sys
from pathlib import Path

import torch
from datasets import Dataset, DatasetDict
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    HfArgumentParser,
    TrainingArguments,
    set_seed,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, PeftModel
from trl import SFTTrainer, DataCollatorForCompletionOnlyLM

from config import config

set_seed(42)


def load_dataset_from_jsonl(path: str) -> DatasetDict:
    data = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                data.append(json.loads(line))

    random.shuffle(data)
    split_idx = int(len(data) * (1 - config.val_split))
    train_data = data[:split_idx]
    val_data = data[split_idx:]

    def convert(records):
        return {"messages": [r["messages"] for r in records]}

    dataset = DatasetDict({
        "train": Dataset.from_list(convert(train_data)),
        "validation": Dataset.from_list(convert(val_data)),
    })
    return dataset


def formatting_func(example):
    return example["messages"]


def main():
    print("=" * 60)
    print("Lexia - Fine-tuning Legal Assistant")
    print("=" * 60)

    if not Path(config.dataset_path).exists():
        print(f"\n[ERROR] Dataset no encontrado en: {config.dataset_path}")
        print("Ejecuta primero: python generate_dataset.py")
        sys.exit(1)

    print(f"\n[1/5] Cargando dataset desde: {config.dataset_path}")
    dataset = load_dataset_from_jsonl(config.dataset_path)
    print(f"  Train: {len(dataset['train'])} ejemplos")
    print(f"  Validation: {len(dataset['validation'])} ejemplos")

    print(f"\n[2/5] Configurando cuantización (4-bit QLoRA)...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=config.load_in_4bit,
        bnb_4bit_compute_dtype=getattr(torch, config.bnb_4bit_compute_dtype),
        bnb_4bit_quant_type=config.bnb_4bit_quant_type,
        bnb_4bit_use_double_quant=config.bnb_4bit_use_double_quant,
    )

    print(f"\n[3/5] Cargando modelo base: {config.base_model}")
    print("  (Descarga inicial ~15GB, puede tomar varios minutos...)")
    model = AutoModelForCausalLM.from_pretrained(
        config.base_model,
        quantization_config=bnb_config if config.use_quantization else None,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=torch.float16,
    )

    tokenizer = AutoTokenizer.from_pretrained(
        config.base_model,
        trust_remote_code=True,
        padding_side="right",
    )

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model)

    print(f"\n[4/5] Configurando LoRA (rank={config.lora_r}, alpha={config.lora_alpha})...")
    peft_config = LoraConfig(
        r=config.lora_r,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        target_modules=config.target_modules,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    output_dir = Path(config.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=config.num_epochs,
        per_device_train_batch_size=config.per_device_batch_size,
        per_device_eval_batch_size=config.per_device_batch_size,
        gradient_accumulation_steps=config.gradient_accumulation_steps,
        learning_rate=config.learning_rate,
        warmup_steps=config.warmup_steps,
        logging_steps=config.logging_steps,
        save_steps=config.save_steps,
        eval_strategy=config.eval_strategy,
        eval_steps=config.eval_steps,
        save_total_limit=config.save_total_limit,
        lr_scheduler_type=config.lr_scheduler_type,
        optim=config.optim,
        weight_decay=config.weight_decay,
        max_grad_norm=config.max_grad_norm,
        fp16=True,
        bf16=False,
        report_to="none",
        remove_unused_columns=False,
        dataloader_num_workers=2,
        gradient_checkpointing=True,
        logging_dir=str(output_dir / "logs"),
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        args=training_args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        max_seq_length=config.max_seq_length,
        formatting_func=formatting_func,
        packing=config.packing,
    )

    print(f"\n[5/5] Iniciando entrenamiento...")
    print(f"  Épocas: {config.num_epochs}")
    print(f"  Batch size efectivo: {config.per_device_batch_size * config.gradient_accumulation_steps}")
    print(f"  Max seq length: {config.max_seq_length}")
    print(f"  Learning rate: {config.learning_rate}")
    print(f"  Output dir: {output_dir}")
    print(f"  Total steps aprox: {math.ceil(len(dataset['train']) / (config.per_device_batch_size * config.gradient_accumulation_steps)) * config.num_epochs}")
    print()

    trainer.train()

    print(f"\nGuardando LoRA adapter en: {config.adapter_path}")
    adapter_path = Path(config.adapter_path)
    adapter_path.mkdir(parents=True, exist_ok=True)
    trainer.model.save_pretrained(str(adapter_path))
    tokenizer.save_pretrained(str(adapter_path))

    print(f"\n¡Fine-tuning completado!\n")
    print(f"  LoRA adapter: {adapter_path}")
    print()
    print("Para fusionar el adapter con el modelo base:")
    print(f"  python -c \"from train import merge_model; merge_model()\"")
    print()
    print("Para iniciar el servidor de inferencia:")
    print(f"  python inference.py")


def merge_model():
    print(f"Cargando modelo base: {config.base_model}")
    tokenizer = AutoTokenizer.from_pretrained(config.base_model)
    model = AutoModelForCausalLM.from_pretrained(
        config.base_model,
        device_map="auto",
        torch_dtype=torch.float16,
    )

    print(f"Cargando LoRA adapter desde: {config.adapter_path}")
    model = PeftModel.from_pretrained(model, config.adapter_path)

    print(f"Fusionando y descargando...")
    model = model.merge_and_unload()

    output_path = Path(config.merged_model_path)
    output_path.mkdir(parents=True, exist_ok=True)

    print(f"Guardando modelo fusionado en: {output_path}")
    model.save_pretrained(str(output_path))
    tokenizer.save_pretrained(str(output_path))
    print("¡Fusión completada!")


if __name__ == "__main__":
    import random
    main()
