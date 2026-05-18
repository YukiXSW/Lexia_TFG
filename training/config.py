import os
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class TrainingConfig:
    base_model: str = "meta-llama/Meta-Llama-3.1-8B-Instruct"

    use_quantization: bool = True
    load_in_4bit: bool = True
    bnb_4bit_compute_dtype: str = "float16"
    bnb_4bit_quant_type: str = "nf4"
    bnb_4bit_use_double_quant: bool = True

    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    target_modules: list = field(default_factory=lambda: [
        "q_proj", "v_proj", "k_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ])

    num_epochs: int = 10
    per_device_batch_size: int = 2
    gradient_accumulation_steps: int = 8
    learning_rate: float = 2e-4
    max_seq_length: int = 2048
    warmup_steps: int = 100
    logging_steps: int = 10
    save_steps: int = 200
    eval_strategy: str = "steps"
    eval_steps: int = 400
    save_total_limit: int = 3
    lr_scheduler_type: str = "cosine"
    optim: str = "paged_adamw_8bit"
    weight_decay: float = 0.001
    max_grad_norm: float = 0.3
    packing: bool = False

    output_dir: str = os.path.join(os.path.dirname(__file__), "models", "lexia-legal-lora")
    adapter_path: str = os.path.join(os.path.dirname(__file__), "models", "lexia-legal-adapter")
    merged_model_path: str = os.path.join(os.path.dirname(__file__), "models", "lexia-legal-merged")

    dataset_path: str = os.path.join(os.path.dirname(__file__), "data", "legal_qa_dataset.jsonl")
    num_qa_pairs_per_doc: int = 10
    val_split: float = 0.1

    groq_model: str = "llama-3.1-8b-instant"
    groq_temperature: float = 0.7
    groq_max_tokens: int = 1024

    inference_host: str = "0.0.0.0"
    inference_port: int = 8000
    use_streaming: bool = True

    system_prompt: str = (
        "Eres Lexia, un asistente legal inteligente y profesional especializado en derecho español. "
        "Debes proporcionar información legal general y educativa basada en la legislación vigente. "
        "Explica los conceptos jurídicos de forma clara y accesible para todos los públicos, "
        "usando lenguaje sencillo y ejemplos cotidianos. "
        "Siempre cita las fuentes legales que utilices (ley y artículo). "
        "Siempre aclara que NO eres un abogado y que tus respuestas no constituyen asesoría legal profesional. "
        "Responde SOLO en español."
    )


config = TrainingConfig()
