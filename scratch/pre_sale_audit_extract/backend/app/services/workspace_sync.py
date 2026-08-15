import json
import zlib
import base64
import hashlib
import time
import uuid
from typing import List, Dict, Any, Optional

class WorkspaceSyncServiceEngine:
    @staticmethod
    def compute_checksum(data_str: str) -> str:
        return hashlib.sha256(data_str.encode('utf-8')).hexdigest()

    @staticmethod
    def compress_payload(data_dict: Dict[str, Any]) -> str:
        raw_json = json.dumps(data_dict)
        compressed = zlib.compress(raw_json.encode('utf-8'))
        return base64.b64encode(compressed).decode('utf-8')

    @staticmethod
    def decompress_payload(compressed_str: str) -> Dict[str, Any]:
        try:
            raw_bytes = base64.b64decode(compressed_str.encode('utf-8'))
            decompressed = zlib.decompress(raw_bytes).decode('utf-8')
            return json.loads(decompressed)
        except Exception:
            return json.loads(compressed_str)

    @staticmethod
    def generate_share_token() -> str:
        return f"qtws-{uuid.uuid4().hex[:16]}"

    @staticmethod
    def merge_configs(cloud_config: Dict[str, Any], local_config: Dict[str, Any]) -> Dict[str, Any]:
        merged = {**cloud_config, **local_config}
        merged["merged_at"] = time.time()
        return merged

workspace_sync_engine = WorkspaceSyncServiceEngine()
