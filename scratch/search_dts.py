
import os

filepath = r'c:\Users\sando\Desktop\ccmpro\node_modules\@google\genai\dist\web\web.d.ts'
if os.path.exists(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if 'export declare enum Type' in line or 'export declare type Type' in line:
                print(f"{i+1}: {line.strip()}")
else:
    print("File not found")
