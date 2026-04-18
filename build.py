import os
import subprocess
import re

# --- CONFIGURATION ---
SOURCE_FILES = ["price-tracker-core.user.js", "price-tracker-gui.user.js"]
OUTPUT_DIR = "dist"
OBFUSCATOR_CMD = "npx javascript-obfuscator"

# Security Settings for Obfuscation
OBFUSCATION_SETTINGS = [
    "--compact", "true",
    "--control-flow-flattening", "false",
    "--identifier-names-generator", "hexadecimal",
    "--rename-globals", "false",
    "--string-array", "true",
    "--string-array-encoding", "base64",
    "--string-array-threshold", "1"
]

def clean_dist():
    """Ensure the output directory exists and is ready."""
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"[Build] Created directory: {OUTPUT_DIR}")

def process_file(source_name):
    """Obfuscate script body while preserving metadata header."""
    print(f"\n[Build] Protection started: {source_name}")
    
    if not os.path.exists(source_name):
        print(f"[Error] Source not found: {source_name}")
        return

    with open(source_name, "r", encoding="utf-8") as f:
        content = f.read()

    # Split metadata and body
    meta_boundary = "// ==/UserScript=="
    if meta_boundary not in content:
        print(f"[Error] Invalid metadata in {source_name}")
        return

    meta_parts = content.split(meta_boundary)
    metadata = meta_parts[0] + meta_boundary
    body = meta_parts[1]

    temp_input = "temp_src.js"
    temp_output = "temp_obf.js"
    
    with open(temp_input, "w", encoding="utf-8") as f:
        f.write(body)

    # Execute obfuscator
    build_cmd = f"{OBFUSCATOR_CMD} {temp_input} --output {temp_output} " + " ".join(OBFUSCATION_SETTINGS)
    try:
        subprocess.run(build_cmd, shell=True, check=True, capture_output=True)
        
        with open(temp_output, "r", encoding="utf-8") as f:
            protected_body = f.read()

        # Combine and Save
        final_script = metadata + "\n\n" + protected_body
        output_path = os.path.join(OUTPUT_DIR, source_name)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(final_script)
            
        print(f"[Build] Protection success: {output_path}")

    except subprocess.CalledProcessError as e:
        print(f"[Error] Obfuscation failed for {source_name}")
        if e.stderr: print(e.stderr.decode())
    
    finally:
        # Cleanup
        for temp in [temp_input, temp_output]:
            if os.path.exists(temp): os.remove(temp)

def run_build():
    clean_dist()
    for source in SOURCE_FILES:
        process_file(source)
    print("\n[Build] All tasks completed successfully.")

if __name__ == "__main__":
    run_build()
