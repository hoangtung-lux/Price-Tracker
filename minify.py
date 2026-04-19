import os
import re

ROOT_DIR = r"c:\Users\Admin\Documents\mamamai viethoa"
USER_JS = os.path.join(ROOT_DIR, "price-tracker.user.js")

def minify(code):
    # 1. Remove comments
    # Remove single line comments (but keep metadata block)
    code = re.sub(r'(?<![:/])//.*?\n', '\n', code)
    # Remove multi-line comments (but keep bundled markers if needed - actually remove them for production)
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.S)
    
    # 2. Compress whitespace
    # Replace multiple spaces with single space
    code = re.sub(r'[ \t]+', ' ', code)
    # Remove whitespace around operators
    code = re.sub(r'\s*([\{\}\(\)\[\]\=\+\-\*\/\,\:\;\?\!\<\>\|\&\^])\s*', r'\1', code)
    # Remove empty lines
    code = re.sub(r'\n\s*\n', '\n', code)
    
    return code.strip()

def run():
    if not os.path.exists(USER_JS):
        print("Error: Targeted file not found for minification")
        return

    with open(USER_JS, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split metadata from logic
    parts = content.split("// ==/UserScript==")
    if len(parts) < 2:
        print("Error: Could not find UserScript metadata end marker")
        return
    
    header = parts[0] + "// ==/UserScript=="
    logic = parts[1]
    
    minified_logic = minify(logic)
    
    final_output = f"{header}\n{minified_logic}"
    
    with open(USER_JS, 'w', encoding='utf-8') as f:
        f.write(final_output)
    
    print(f"Successfully minified: {USER_JS}")
    print(f"Reduced size from {len(content)} to {len(final_output)} bytes")

if __name__ == "__main__":
    run()
