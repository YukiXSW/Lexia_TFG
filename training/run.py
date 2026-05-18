#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path


def run_step(step_name: str, command: list[str]) -> bool:
    print("\n" + "=" * 60)
    print(f"PASO: {step_name}")
    print("=" * 60)
    result = subprocess.run(command, cwd=Path(__file__).parent)
    if result.returncode != 0:
        print(f"\n[ERROR] Falló el paso: {step_name}")
        return False
    print(f"\n[OK] Paso completado: {step_name}")
    return True


def main():
    steps = [
        ("1. Generar dataset desde documentos legales", ["python", "generate_dataset.py"]),
        ("2. Entrenar modelo con LoRA/QLoRA", ["python", "train.py"]),
    ]

    if "--skip-dataset" in sys.argv:
        steps = steps[1:]

    if "--inference" in sys.argv:
        steps.append(("3. Iniciar servidor de inferencia", ["python", "inference.py"]))

    if "--test" in sys.argv:
        steps.append(("3. Probar modelo entrenado", ["python", "test_model.py"]))

    for step_name, command in steps:
        if not run_step(step_name, command):
            sys.exit(1)

    print("\n" + "=" * 60)
    print("PROCESO COMPLETADO")
    print("=" * 60)
    print("\nComandos útiles:")
    print("  python inference.py     - Iniciar servidor de inferencia")
    print("  python test_model.py    - Probar el modelo con preguntas de ejemplo")
    print("  python -c 'from train import merge_model; merge_model()'")
    print("                          - Fusionar LoRA adapter con el modelo base")
    print()


if __name__ == "__main__":
    main()
