import os
import subprocess
import re

ROOT_DIR = r"c:\Users\Admin\Documents\mamamai viethoa"
USER_JS = os.path.join(ROOT_DIR, "price-tracker.user.js")

def run_obfuscator():
    print("Starting Professional Obfuscation...")
    
    # 1. Read the bundled file
    with open(USER_JS, 'r', encoding='utf-8') as f:
        content = f.read()

    # 2. Extract Metadata Header
    parts = content.split("// ==/UserScript==")
    if len(parts) < 2:
        print("Error: Could not find UserScript metadata end marker")
        return
    header = parts[0] + "// ==/UserScript=="
    logic = parts[1]

    # Save logic to temporary file for obfuscator
    temp_logic_path = os.path.join(ROOT_DIR, "temp_logic.js")
    with open(temp_logic_path, 'w', encoding='utf-8') as f:
        f.write(logic)

    # 3. Call obfuscator via npx
    # Targeted settings for hiding APIs and light encryption
    cmd = [
        "npx", "javascript-obfuscator", temp_logic_path,
        "--output", temp_logic_path,
        "--compact", "true",
        "--string-array", "true",
        "--string-array-encoding", "base64",
        "--string-array-threshold", "1",
        "--identifier-names-generator", "hexadecimal",
        "--rename-globals", "false", # Keep VHPriceTrackerCore visible for GUI
        "--self-defending", "false"  # Keep it lightweight
    ]

    try:
        subprocess.run(cmd, check=True, shell=True)
        
        with open(temp_logic_path, 'r', encoding='utf-8') as f:
            obfuscated_logic = f.read()
        
        # 4. Re-assemble
        final_output = f"{header}\n{obfuscated_logic}"
        
        with open(USER_JS, 'w', encoding='utf-8') as f:
            f.write(final_output)
            
        print("Obfuscation completed successfully!")
        
    except subprocess.CalledProcessError as e:
        print(f"Obfuscation failed: {e}")
    finally:
        if os.path.exists(temp_logic_path):
            os.remove(temp_logic_path)

if __name__ == "__main__":
    run_obfuscator()
