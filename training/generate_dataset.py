import json
import os
import random
from pathlib import Path

from groq import Groq
from tqdm import tqdm

from config import config
from seed_documents import SEED_DOCUMENTS

SYSTEM_PROMPT_GENERATOR = (
    "Eres un experto legal que genera preguntas y respuestas sobre derecho español. "
    "Para cada artículo legal que se te proporcione, debes crear preguntas que haría "
    "una persona sin conocimientos jurídicos y respuestas claras basadas en el artículo. "
    "Las preguntas deben ser variadas: algunas directas sobre el contenido, otras "
    "planteando situaciones prácticas cotidianas. Las respuestas deben ser en lenguaje "
    "sencillo, incluir la referencia al artículo, y terminar con un aviso de que no "
    "constituye asesoría legal profesional. Responde SIEMPRE en español."
)

TEMPLATE = (
    "Artículo legal:\n"
    "Ley: {title}\n"
    "Artículo: {article}\n"
    "Contenido: {content}\n"
    "Fuente: {source}\n"
    "\n"
    "Genera {num_pairs} pares de pregunta-respuesta basados en este artículo. "
    "Cada par debe ser realista, como si un ciudadano preguntara y un asistente legal respondiera.\n"
    "\n"
    "Formato de respuesta (devuelve SOLO el JSON, sin explicaciones adicionales):\n"
    "[\n"
    '  {{"question": "Pregunta 1", "answer": "Respuesta 1"}},\n'
    '  {{"question": "Pregunta 2", "answer": "Respuesta 2"}}\n'
    "]"
)


def init_groq() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        env_path = Path(__file__).parent.parent / ".env"
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GROQ_API_KEY="):
                        api_key = line.split("=", 1)[1].strip()
                        break
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY not found. Set it as environment variable or in the .env file."
        )
    return Groq(api_key=api_key)


def generate_qa_pairs(doc, num_pairs: int, client: Groq) -> list[dict] | None:
    prompt = TEMPLATE.format(
        title=doc.title,
        article=doc.article,
        content=doc.content,
        source=doc.source,
        num_pairs=num_pairs,
    )

    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_GENERATOR},
                {"role": "user", "content": prompt},
            ],
            model=config.groq_model,
            temperature=config.groq_temperature,
            max_tokens=config.groq_max_tokens,
        )
        content = response.choices[0].message.content.strip()

        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(
                line for line in lines if not line.startswith("```")
            )

        pairs = json.loads(content)
        if isinstance(pairs, list):
            for p in pairs:
                p["source_id"] = doc.id
                p["source_title"] = doc.title
                p["source_article"] = doc.article
                p["category"] = doc.category
                p["keywords"] = doc.keywords
            return pairs
    except (json.JSONDecodeError, Exception) as e:
        print(f"  Error generando pares para {doc.id}: {e}")
        return None


def format_for_training(pairs: list[dict], system_prompt: str) -> list[dict]:
    formatted = []
    for pair in pairs:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": pair["question"]},
            {"role": "assistant", "content": pair["answer"]},
        ]
        formatted.append({
            "messages": messages,
            "category": pair.get("category", ""),
            "source_id": pair.get("source_id", ""),
        })
    return formatted


def main():
    client = init_groq()

    output_dir = Path(config.dataset_path).parent
    output_dir.mkdir(parents=True, exist_ok=True)

    all_pairs = []
    print(f"Generando {config.num_qa_pairs_per_doc} pares Q&A por documento...")
    print(f"Total documentos: {len(SEED_DOCUMENTS)}")

    for doc in tqdm(SEED_DOCUMENTS, desc="Generando dataset"):
        pairs = generate_qa_pairs(doc, config.num_qa_pairs_per_doc, client)
        if pairs:
            all_pairs.extend(pairs)

    train_data = format_for_training(all_pairs, config.system_prompt)

    with open(config.dataset_path, "w", encoding="utf-8") as f:
        for item in train_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    print(f"\nDataset guardado en: {config.dataset_path}")
    print(f"Total ejemplos: {len(train_data)}")

    categories = {}
    for item in train_data:
        cat = item["category"]
        categories[cat] = categories.get(cat, 0) + 1
    print("\nDistribución por categorías:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")


if __name__ == "__main__":
    main()
