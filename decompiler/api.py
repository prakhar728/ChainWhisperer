from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from subprocess import run, PIPE
from web3 import Web3
import os
import tempfile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ insecure in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DecompileRequest(BaseModel):
    address: str = None
    bytecode: str = None
    rpc: str = "https://rpc.sepolia.mantle.xyz"

@app.post("/decompile")
async def decompile(req: DecompileRequest):
    if not req.bytecode and not req.address:
        raise HTTPException(status_code=400, detail="Provide either bytecode or address")

    if req.address:
        try:
            w3 = Web3(Web3.HTTPProvider(req.rpc))
            code = await get_code(w3, req.address)
            if not code or code == "0x":
                raise HTTPException(status_code=404, detail="Contract not found or empty bytecode")
            bytecode = code
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch bytecode: {str(e)}")
    else:
        bytecode = req.bytecode

    try:
        result = run(["panoramix", bytecode], stdout=PIPE, stderr=PIPE, text=True, timeout=60)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=result.stderr.strip())
        return {"source": result.stdout}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Panoramix execution failed: {str(e)}")

async def get_code(w3: Web3, address: str) -> str:
    return await w3.eth.get_code(address).hex()
