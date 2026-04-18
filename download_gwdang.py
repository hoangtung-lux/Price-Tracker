import urllib.request
import urllib.error
import zipfile
import io
import os
import ssl

# 购物党 Extension ID
ext_id = "jgphnjnmmjhmbngndhndgclgkgjncgmg"

# Try multiple CRX download methods
urls = [
    # Method 1: Direct Google update API with nacl
    f"https://clients2.google.com/service/update2/crx?response=redirect&os=win&arch=x86-64&os_arch=x86-64&nacl_arch=x86-64&prod=chromecrx&prodchannel=unknown&prodversion=114.0.5735.199&acceptformat=crx2,crx3&x=id%3D{ext_id}%26uc",
    # Method 2: Alternative prodversion
    f"https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120.0.0.0&acceptformat=crx2,crx3&x=id%3D{ext_id}%26uc",
    # Method 3: Edge addon store (since user showed it's also on Edge)
    f"https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&x=id%3D{ext_id}%26installsource%3Dondemand%26uc",
]

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

for i, url in enumerate(urls):
    try:
        print(f"Trying method {i+1}...")
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        res = urllib.request.urlopen(req, context=ctx).read()
        
        with open('gwdang_extension.crx', 'wb') as f:
            f.write(res)
        print(f"Downloaded! ({len(res)} bytes)")
        
        start = res.find(b'PK\x03\x04')
        if start != -1:
            zip_data = res[start:]
            out_dir = 'gwdang_extracted'
            if os.path.exists(out_dir):
                import shutil
                shutil.rmtree(out_dir)
            os.makedirs(out_dir, exist_ok=True)
            with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
                z.extractall(out_dir)
            print(f"Extracted to {out_dir}/")
            for root, dirs, files in os.walk(out_dir):
                for fname in files:
                    path = os.path.join(root, fname)
                    size = os.path.getsize(path)
                    rel = os.path.relpath(path, out_dir)
                    print(f"  {rel} ({size} bytes)")
            break
        else:
            print("No ZIP header found in downloaded file")
    except Exception as e:
        print(f"Method {i+1} failed: {e}")

