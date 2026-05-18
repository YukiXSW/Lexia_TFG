import json
import re
import time
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

from config import config

EVAL_QUESTIONS = [
    {
        "question": "Me han despedido del trabajo después de 5 años. ¿Qué indemnización me corresponde?",
        "category": "laboral",
        "expected_sources": ["Estatuto", "55", "56", "33 días"],
        "in_training": True,
    },
    {
        "question": "Un vecino de mi comunidad pone música alta todas las noches. ¿Qué puedo hacer?",
        "category": "civil",
        "expected_sources": ["Propiedad Horizontal", "7", "actividades molestas", "comunidad"],
        "in_training": True,
    },
    {
        "question": "He comprado un móvil y se ha estropeado a los 3 meses. ¿Tengo derecho a que me lo reparen?",
        "category": "consumidor",
        "expected_sources": ["TRLGDCU", "114", "garantía", "2 años"],
        "in_training": True,
    },
    {
        "question": "Me han puesto una multa de 200€ por exceso de velocidad. ¿Puedo recurrirla?",
        "category": "trafico",
        "expected_sources": ["Tráfico", "multa", "recurso"],
        "in_training": True,
    },
    {
        "question": "Una empresa está usando mi foto en su web sin mi permiso. ¿Es legal?",
        "category": "proteccion-datos",
        "expected_sources": ["RGPD", "consentimiento", "datos personales", "LOPDGDD"],
        "in_training": True,
    },
    {
        "question": "Firmé un contrato de alquiler por 1 año y quiero irme a los 6 meses. ¿Puedo?",
        "category": "civil",
        "expected_sources": ["LAU", "Arrendamientos Urbanos", "9"],
        "in_training": True,
    },
    {
        "question": "¿Cuánto tiempo tengo para reclamar una deuda de un préstamo entre particulares?",
        "category": "civil",
        "expected_sources": ["Código Civil", "1964", "prescripción", "5 años"],
        "in_training": True,
    },
    {
        "question": "Mi empresa me obliga a trabajar 50 horas semanales sin pagar horas extra. ¿Es legal?",
        "category": "laboral",
        "expected_sources": ["Estatuto", "34", "jornada", "40 horas"],
        "in_training": True,
    },
    {
        "question": "Me han detenido por un delito que no cometí. ¿Qué derechos tengo?",
        "category": "procesal",
        "expected_sources": ["Enjuiciamiento Criminal", "118", "defensa", "abogado"],
        "in_training": True,
    },
    {
        "question": "¿Qué hago si la Administración no me responde en el plazo legal?",
        "category": "administrativo",
        "expected_sources": ["39/2015", "21", "silencio administrativo"],
        "in_training": True,
    },
    {
        "question": "Un conductor borracho chocó contra mi coche aparcado. ¿Tengo derecho a indemnización?",
        "category": "civil",
        "expected_sources": ["1902", "responsabilidad civil", "indemnización"],
        "in_training": False,
    },
    {
        "question": "Estoy pensando en divorciarme. ¿Cómo es el proceso legal en España?",
        "category": "familia",
        "expected_sources": ["Código Civil", "divorcio", "separación"],
        "in_training": False,
    },
    {
        "question": "Heredé una casa de mis padres pero tengo hermanos. ¿Cómo se reparte la herencia?",
        "category": "civil",
        "expected_sources": ["herencia", "legítima", "Código Civil"],
        "in_training": False,
    },
    {
        "question": "Quiero montar una tienda online. ¿Qué requisitos legales necesito?",
        "category": "mercantil",
        "expected_sources": ["LSSI", "protección datos", "RGPD", "consumidores"],
        "in_training": False,
    },
    {
        "question": "Tengo una mascota que ha mordido a un vecino. ¿Quién paga los daños?",
        "category": "civil",
        "expected_sources": ["1902", "responsabilidad civil", "daño"],
        "in_training": False,
    },
]


def load_model(use_adapter: bool = True):
    if use_adapter:
        tokenizer = AutoTokenizer.from_pretrained(config.adapter_path)
        base = AutoModelForCausalLM.from_pretrained(
            config.base_model,
            device_map="auto",
            torch_dtype=torch.float16,
        )
        model = PeftModel.from_pretrained(base, config.adapter_path)
    else:
        tokenizer = AutoTokenizer.from_pretrained(config.base_model)
        model = AutoModelForCausalLM.from_pretrained(
            config.base_model,
            device_map="auto",
            torch_dtype=torch.float16,
        )
    model.eval()
    return model, tokenizer


def ask(model, tokenizer, question: str) -> str:
    messages = [
        {"role": "system", "content": config.system_prompt},
        {"role": "user", "content": question},
    ]
    prompt = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
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


def evaluate_response(question: str, response: str, expected_sources: list[str]) -> dict:
    result = {
        "length": len(response),
        "has_disclaimer": any(p in response.lower() for p in [
            "abogado", "asesoría legal", "profesional del derecho",
            "asesoramiento legal", "no soy abogado", "consulta con un abogado",
        ]),
        "sources_found": [],
        "sources_missed": [],
        "legal_reference_count": len(re.findall(r'(artículo|art\.|ley|Ley|art\b|Código|Estatuto|Reglamento|RGPD|LOPDGDD|LAU|TRLGDCU)\s*[\d\.\s]*', response, re.IGNORECASE)),
        "has_citation": False,
        "language_is_spanish": bool(re.search(r'[áéíóúñ¿¡]', response)),
    }

    for source in expected_sources:
        if source.lower() in response.lower():
            result["sources_found"].append(source)
        else:
            result["sources_missed"].append(source)

    result["source_hit_rate"] = len(result["sources_found"]) / len(expected_sources) if expected_sources else 0
    result["has_citation"] = result["legal_reference_count"] >= 1

    return result


def main():
    print("=" * 60)
    print("Lexia - Evaluación del Modelo Fine-tuneado")
    print("=" * 60)

    adapter_path = Path(config.adapter_path)
    if not adapter_path.exists() or not (adapter_path / "adapter_config.json").exists():
        print(f"\n[ERROR] Adapter no encontrado en: {config.adapter_path}")
        print("Ejecuta primero: python train.py")
        return

    print(f"\nCargando modelo fine-tuneado...")
    start = time.time()
    model, tokenizer = load_model(use_adapter=True)
    print(f"Modelo cargado en {time.time() - start:.1f}s")

    results = []

    print(f"\nEvaluando {len(EVAL_QUESTIONS)} preguntas...\n")

    for i, item in enumerate(EVAL_QUESTIONS, 1):
        q = item["question"]
        cat = item["category"]
        in_train = item["in_training"]

        print(f"[{i}/{len(EVAL_QUESTIONS)}] [{cat}] {'✓' if in_train else '✗'} {q[:60]}...")

        try:
            response = ask(model, tokenizer, q)
            eval_result = evaluate_response(q, response, item["expected_sources"])
            eval_result["question"] = q
            eval_result["category"] = cat
            eval_result["in_training"] = in_train
            eval_result["response_preview"] = response[:200]
            results.append(eval_result)

            status = "✓" if eval_result["source_hit_rate"] >= 0.5 else "⚠"
            print(f"  {status} Fuentes: {eval_result['sources_found']}")
            print(f"  ﾠ  Disclaimer: {'✓' if eval_result['has_disclaimer'] else '✗'} | Citas: {eval_result['legal_reference_count']}")

        except Exception as e:
            print(f"  ERROR: {e}")

        print("-" * 60)

    in_train_results = [r for r in results if r["in_training"]]
    ood_results = [r for r in results if not r["in_training"]]

    print("\n" + "=" * 60)
    print("RESUMEN DE EVALUACIÓN")
    print("=" * 60)
    print(f"\nTotal preguntas: {len(results)}")
    print(f"  En training: {len(in_train_results)}")
    print(f"  Novedosas (OOD): {len(ood_results)}")

    if in_train_results:
        print("\n--- Métricas (datos de training) ---")
        print(f"  Precisión fuentes promedio: {sum(r['source_hit_rate'] for r in in_train_results) / len(in_train_results):.0%}")
        print(f"  Disclaimer presente: {sum(r['has_disclaimer'] for r in in_train_results)}/{len(in_train_results)} ({sum(r['has_disclaimer'] for r in in_train_results) / len(in_train_results):.0%})")
        print(f"  Citas legales promedio: {sum(r['legal_reference_count'] for r in in_train_results) / len(in_train_results):.1f}")
        print(f"  Respuesta media: {sum(r['length'] for r in in_train_results) / len(in_train_results):.0f} caracteres")

    if ood_results:
        print("\n--- Métricas (datos NO vistos) ---")
        print(f"  Precisión fuentes promedio: {sum(r['source_hit_rate'] for r in ood_results) / len(ood_results):.0%}")
        print(f"  Disclaimer presente: {sum(r['has_disclaimer'] for r in ood_results)}/{len(ood_results)} ({sum(r['has_disclaimer'] for r in ood_results) / len(ood_results):.0%})")
        print(f"  Citas legales promedio: {sum(r['legal_reference_count'] for r in ood_results) / len(ood_results):.1f}")

    report_path = Path(config.dataset_path).parent / "evaluation_report.jsonl"
    with open(report_path, "w", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"\nReporte detallado guardado en: {report_path}")

    print("\n" + "=" * 60)
    print(f"Puntuación global del fine-tuning:")
    all_scores = [r["source_hit_rate"] for r in results]
    avg = sum(all_scores) / len(all_scores) if all_scores else 0
    if avg >= 0.7:
        print("  BUENO (≥70% acierto en fuentes legales)")
    elif avg >= 0.4:
        print("  REGULAR (40-70% acierto) - considera más datos o épocas")
    else:
        print("  NECESITA MEJORA (<40%) - aumenta datos o revisa el training")
    print(f"  Score: {avg:.0%}")
    print()


if __name__ == "__main__":
    main()
