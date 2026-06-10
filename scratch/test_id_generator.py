import sys
import os
import concurrent.futures
import time

# Add backend to path to import generate_safe_id
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

try:
    from database_bq import generate_safe_id  # type: ignore
    print("Imported generate_safe_id successfully!")
except ImportError as e:
    print(f"Failed to import generate_safe_id: {e}")
    sys.exit(1)

def test_id_properties():
    print("--- Running basic property tests ---")
    
    # 1. Test range
    max_safe_int = 9007199254740991
    sample_ids = [generate_safe_id() for _ in range(1000)]
    
    all_under_limit = all(i < max_safe_int for i in sample_ids)
    all_positive = all(i > 0 for i in sample_ids)
    
    print(f"Generated 1000 IDs.")
    print(f"Max generated ID: {max(sample_ids)}")
    print(f"Min generated ID: {min(sample_ids)}")
    print(f"All under JS safe integer limit ({max_safe_int})? {all_under_limit}")
    print(f"All IDs positive? {all_positive}")
    
    if not all_under_limit or not all_positive:
        print("FAIL: Range or positivity constraint violated!")
        sys.exit(1)
    
    # 2. Test monotonicity (approximately increasing)
    time.sleep(0.01)
    id1 = generate_safe_id()
    time.sleep(0.01)
    id2 = generate_safe_id()
    print(f"Chronological test: {id1} < {id2}? {id1 < id2}")
    if not (id1 < id2):
        print("FAIL: Chronological ordering constraint violated!")
        sys.exit(1)
        
    print("Basic property tests PASSED.\n")

def test_concurrency():
    print("--- Running concurrency/collision tests ---")
    num_threads = 50
    ids_per_thread = 2000
    total_ids_expected = num_threads * ids_per_thread
    
    generated_ids = []
    
    def worker():
        local_ids = []
        for _ in range(ids_per_thread):
            local_ids.append(generate_safe_id())
        return local_ids
        
    start_time = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(worker) for _ in range(num_threads)]
        for future in concurrent.futures.as_completed(futures):
            generated_ids.extend(future.result())
    end_time = time.time()
    
    duration = end_time - start_time
    unique_ids = set(generated_ids)
    collisions = len(generated_ids) - len(unique_ids)
    
    print(f"Generated {len(generated_ids)} IDs using {num_threads} concurrent threads in {duration:.3f} seconds.")
    print(f"Unique IDs: {len(unique_ids)}")
    print(f"Collisions: {collisions}")
    print(f"Generation rate: {len(generated_ids) / duration:.2f} IDs/sec")
    
    if collisions > 0:
        print("FAIL: Collisions detected during concurrent generation!")
        sys.exit(1)
        
    print("Concurrency/collision tests PASSED.\n")

if __name__ == "__main__":
    test_id_properties()
    test_concurrency()
    print("All tests PASSED successfully!")
