import os
import subprocess
import re

# --- CONFIGURATION ---
SOURCE_FILES = ["price-tracker-core.user.js", "price-tracker-gui.user.js"]
DIST_DIR = "dist"
OBFUSCATOR_CMD = "npx javascript-obfuscator"

# Obfuscation settings (Strong but stable)
OBFUSCATION_OPTIONS = [
    "--compact", "true",
    "--control-flow-flattening", "false", # Keep false for performance/stability unless requested
    "--dead-code-injection", "false",
    "--debug-protection", "false",
    "--disable-console-output", "false",
    "--identifier-names-generator", "hexadecimal",
    "--rename-globals", "false",          # Keep false to avoid breaking external APIs (GM_ xmlhttpRequest)
    "--string-array", "true",
    "--string-array-encoding", "base64",
    "--string-array-threshold", "1"
]

def ensure_dist():
    if not os.path.exists(DIST_DIR):
        os.makedirs(DIST_DIR)
        print(f"Created {DIST_DIR} directory.")

def obfuscate_file(filename):
    print(f"\n--- Processing: {filename} ---")
    
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Extract Metadata Block
    meta_match = re.search(r"(// ==UserScript==.*?// ==/UserScript==)", content, re.DOTALL)
    if not meta_match:
        print(f"Error: No UserScript metadata found in {filename}")
        return

    metadata = meta_match.group(1)
    body = content.replace(metadata, "")

    # 2. Save body to temp file for obfuscator
    temp_body = "temp_body.js"
    temp_obf = "temp_obf.js"
    with open(temp_body, "w", encoding="utf-8") as f:
        f.write(body)

    # 3. Run Obfuscator
    print(f"Running obfuscator on {filename} body...")
    cmd = [OBFUSCATOR_CMD, temp_body, "--output", temp_obf] + OBFUSCATION_OPTIONS
    try:
        subprocess.run(" ".join(cmd), shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Obfuscation failed: {e}")
        return

    # 4. Combine Metadata + Obfuscated Body
    with open(temp_obf, "r", encoding="utf-8") as f:
        obfuscated_body = f.read()

    final_content = metadata + "\n\n" + obfuscated_body
    
    output_path = os.path.join(DIST_DIR, filename)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(final_content)

    # 5. Cleanup
    if os.path.exists(temp_body): os.remove(temp_body)
    if os.path.exists(temp_obf): os.remove(temp_obf)

    print(f"Success! Protected script saved to: {output_path}")

if __name__ == "__main__":
    ensure_dist()
    for f in SOURCE_FILES:
        obfuscate_file(f)
    print("\nAll scripts protected successfully.")
