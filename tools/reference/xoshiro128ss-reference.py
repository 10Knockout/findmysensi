#!/usr/bin/env python3
"""
Independent reference implementation of xoshiro128** (xoshiro128starstar 1.0)
Generates golden test vectors for FindMySensi PrngV1.
"""
import json
import os
import struct

def rotl(x: int, k: int) -> int:
    return ((x << k) & 0xFFFFFFFF) | (x >> (32 - k))

class Xoshiro128StarStar:
    def __init__(self, seed_bytes: bytes):
        if len(seed_bytes) == 16:
            s0, s1, s2, s3 = struct.unpack("<4I", seed_bytes)
        else:
            raise ValueError("Seed must be exactly 16 bytes")
        
        if s0 == 0 and s1 == 0 and s2 == 0 and s3 == 0:
            # Non-zero constant fallback if all zeros
            s0 = 0x9E3779B9
            s1 = 0xBB67AE85
            s2 = 0x3C6EF372
            s3 = 0xA54FF53A
            
        self.s0 = s0 & 0xFFFFFFFF
        self.s1 = s1 & 0xFFFFFFFF
        self.s2 = s2 & 0xFFFFFFFF
        self.s3 = s3 & 0xFFFFFFFF

    def next_u32(self) -> int:
        mult5 = (self.s1 * 5) & 0xFFFFFFFF
        rot1 = rotl(mult5, 7)
        result = (rot1 * 9) & 0xFFFFFFFF

        t = (self.s1 << 9) & 0xFFFFFFFF

        self.s2 ^= self.s0
        self.s3 ^= self.s1
        self.s1 ^= self.s2
        self.s0 ^= self.s3

        self.s2 ^= t
        self.s3 = rotl(self.s3, 11)

        return result

    def next_range(self, min_inc: int, max_exc: int) -> int:
        range_size = max_exc - min_inc
        if range_size <= 0:
            raise ValueError("Invalid range: max must be greater than min")
        threshold = (0x100000000 - (0x100000000 % range_size)) % 0x100000000
        while True:
            raw = self.next_u32()
            if raw < threshold:
                return min_inc + (raw % range_size)

    def snapshot(self):
        return [self.s0, self.s1, self.s2, self.s3]

def generate_golden_vectors():
    test_cases = [
        {
            "description": "Standard non-zero 16-byte seed",
            "seed_hex": "0102030405060708090a0b0c0d0e0f10",
            "iterations": 10,
            "ranges": [[0, 10], [100, 200], [-50, 50], [0, 16777216]],
        },
        {
            "description": "All-zero 16-byte seed with default constant fallback",
            "seed_hex": "00000000000000000000000000000000",
            "iterations": 10,
            "ranges": [[0, 100], [-1000, 1000]],
        },
        {
            "description": "Ranked scenario seed vector (deterministic aim-core target sequence)",
            "seed_hex": "feedfacecafebabedeadbeef01234567",
            "iterations": 20,
            "ranges": [[0, 6], [0, 16777216], [-4189643, 4189643]],
        }
    ]

    results = []
    for tc in test_cases:
        seed = bytes.fromhex(tc["seed_hex"])
        prng = Xoshiro128StarStar(seed)
        u32_sequence = [prng.next_u32() for _ in range(tc["iterations"])]
        
        # Reset and generate range samples
        prng_range = Xoshiro128StarStar(seed)
        range_results = []
        for r in tc["ranges"]:
            sampled = [prng_range.next_range(r[0], r[1]) for _ in range(5)]
            range_results.append({
                "min": r[0],
                "max": r[1],
                "samples": sampled
            })
            
        results.append({
            "description": tc["description"],
            "seed_hex": tc["seed_hex"],
            "initial_state": [
                list(struct.unpack("<4I", seed)) if seed != bytes(16) else [0x9E3779B9, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A]
            ][0],
            "u32_sequence": u32_sequence,
            "range_sequence": range_results,
            "final_state": prng.snapshot()
        })

    return results

if __name__ == "__main__":
    os.makedirs("tests/golden", exist_ok=True)
    golden_data = {
        "version": "1.0.0",
        "algorithm": "xoshiro128**",
        "generator": "tools/reference/xoshiro128ss-reference.py",
        "vectors": generate_golden_vectors()
    }
    with open("tests/golden/prng-v1.json", "w", encoding="utf-8") as f:
        json.dump(golden_data, f, indent=2)
    print("Generated tests/golden/prng-v1.json successfully.")
