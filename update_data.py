import urllib.parse
import urllib.request
import csv
import io
import json
import os
import sys

SPREADSHEET_ID = "1GLdE_YZ7-Q5oHVDyEun3jhZ9PoKtYblh2s9--YB8mxc"

def fetch_csv(gid):
    url = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={gid}"
    print(f"Downloading GID {gid}...")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            content = response.read().decode('utf-8')
            # Set high limit for CSV processing
            csv.field_size_limit(10000000)
            reader = csv.reader(io.StringIO(content))
            return list(reader)
    except Exception as e:
        print(f"Error fetching GID '{gid}': {e}", file=sys.stderr)
        return []

def main():
    print("Starting data synchronization...")
    
    # 1. Fetch sheets
    nha_rows = fetch_csv("0")
    tdp_rows = fetch_csv("1009809564")
    cb_rows = fetch_csv("307313476")
    
    if not nha_rows or not tdp_rows or not cb_rows:
        print("Error: Failed to fetch one or more sheets. Aborting.", file=sys.stderr)
        sys.exit(1)
        
    # 2. Build Cán bộ map: ID -> { name, phone, rank }
    cb_map = {}
    for r in cb_rows[1:]:
        if not r or len(r) < 8:
            continue
        cb_id = r[0].strip()
        if not cb_id:
            continue
        cb_map[cb_id] = {
            "name": r[3].strip() or r[2].strip(),  # Fallback to Col 2 if Col 3 is empty
            "phone": r[7].strip(),
            "rank": r[5].strip()
        }
    print(f"Mapped {len(cb_map)} officers.")
    
    # 3. Build Tổ dân phố map: ID -> { name, cskv: {name, phone}, hs: {name, phone} }
    tdp_map = {}
    for r in tdp_rows[1:]:
        if not r or len(r) < 8:
            continue
        tdp_id = r[0].strip()
        if not tdp_id:
            continue
            
        cskv_id = r[4].strip()
        hs_id = r[6].strip()
        
        cskv_officer = cb_map.get(cskv_id)
        hs_officer = cb_map.get(hs_id)
        
        tdp_map[tdp_id] = {
            "name": r[1].strip(),
            "cskv": cskv_officer if cskv_officer else None,
            "hs": hs_officer if hs_officer else None
        }
    print(f"Mapped {len(tdp_map)} Tổ dân phố areas.")
    
    # 4. Process Định danh nhà
    addresses = []
    for r in nha_rows[1:]:
        if not r or len(r) < 6:
            continue
            
        # Filter empty rows
        nha_id = r[0].strip()
        ten = r[2].strip()
        dc = r[3].strip()
        tuyen = r[4].strip()
        tdp = r[5].strip()
        
        if not nha_id and not ten and not dc:
            continue
            
        # Address priority: dc if present, else ten
        # Clean whitespaces
        ten = " ".join(ten.split())
        dc = " ".join(dc.split())
        tuyen = " ".join(tuyen.split())
        tdp = tdp.strip()
        
        if not ten and not dc:
            continue
            
        # Optimize JSON representation:
        # If ten and dc are identical, store [ten, tdp]
        # If dc is empty, store [ten, tdp]
        # If ten is empty, store [dc, tdp]
        # Otherwise, store [ten, dc, tdp]
        if not dc:
            item = [ten, tdp]
        elif not ten:
            item = [dc, tdp]
        elif ten == dc:
            item = [ten, tdp]
        else:
            item = [ten, dc, tdp]
            
        addresses.append(item)
        
    print(f"Processed {len(addresses)} addresses.")
    
    # 5. Output data structure
    out_data = {
        "tdps": tdp_map,
        "addresses": addresses
    }
    
    output_path = "data.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(out_data, f, ensure_ascii=False, separators=(',', ':'))
        
    print(f"Successfully generated {output_path}. Size: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    main()
