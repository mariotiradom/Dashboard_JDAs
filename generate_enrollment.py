import pandas as pd
import json
import traceback

mapping = {}

try:
    df26 = pd.read_csv('DataBase/BBDD SALONES 26-1 - BBDD REDA.csv')
    for _, row in df26.iterrows():
        curso = str(row.get('Curso', '')).strip()
        seccion = str(row.get('Sección', '')).strip()
        mat = row.get('Total Matriculados')
        mat = int(mat) if pd.notna(mat) else 0
        if curso and seccion:
            mapping[f"26-1_{curso}_{seccion}"] = mat
except Exception as e:
    print("Error 26-1:", e)

try:
    df25_2 = pd.read_csv('DataBase/BBDD REAS 25-2 - BBDD.csv')
    for _, row in df25_2.iterrows():
        curso = str(row.get('Curso', '')).strip()
        seccion = str(row.get('Sección', '')).strip()
        mat = row.get('Total Matriculados')
        mat = int(mat) if pd.notna(mat) else 0
        if curso and seccion:
            mapping[f"25-2_{curso}_{seccion}"] = mat
except Exception as e:
    print("Error 25-2:", e)

try:
    df25_1 = pd.read_csv('DataBase/oferta académica 2025 I.xlsx - Consumo final de cupos por secc.csv')
    for _, row in df25_1.iterrows():
        curso = str(row.get('Curso', '')).strip()
        seccion = str(row.get('Sección', '')).strip()
        mat = row.get('Total Matriculados')
        mat = int(mat) if pd.notna(mat) else 0
        if curso and seccion:
            mapping[f"25-1_{curso}_{seccion}"] = mat
except Exception as e:
    print("Error 25-1:", e)

with open('DataBase/enrollment.json', 'w', encoding='utf-8') as f:
    json.dump(mapping, f, ensure_ascii=False, indent=2)

print("Enrollment JSON generated!")
