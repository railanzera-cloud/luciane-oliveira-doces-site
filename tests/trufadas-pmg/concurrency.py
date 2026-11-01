"""Concurrência do trigger verdadeiro em PostgreSQL isolado. Sem pedidos reais."""
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor
import psycopg

DSN=os.environ.get("LOD_TEST_PG_DSN", "postgresql://postgres:synthetic_ci_only@127.0.0.1:5432/postgres")
KEY="trufada_pacoca_p"
OID1="00000000-0000-4000-8000-000000000011"
OID2="00000000-0000-4000-8000-000000000012"
with psycopg.connect(DSN,autocommit=True) as c:
    for oid in (OID1,OID2):
        c.execute("INSERT INTO public.orders (id) VALUES (%s::uuid)",(oid,))
gate=threading.Event()
def first():
    with psycopg.connect(DSN) as c:
        c.execute("SET lock_timeout='8s'")
        c.execute("INSERT INTO public.order_items(order_uuid,item_key,quantity) VALUES (%s::uuid,%s,2)",(OID1,KEY))
        gate.set()
        time.sleep(1.2)
        c.commit()
    return "committed"
def second():
    if not gate.wait(7):
        raise RuntimeError("first reservation was never obtained")
    start=time.monotonic()
    try:
        with psycopg.connect(DSN) as c:
            c.execute("SET lock_timeout='8s'")
            c.execute("INSERT INTO public.order_items(order_uuid,item_key,quantity) VALUES (%s::uuid,%s,2)",(OID2,KEY))
            c.commit()
        raise AssertionError("overselling: second order was accepted despite 3 total and 2 reserved")
    except psycopg.Error as e:
        if "crocante_sem_estoque" not in str(e):
            raise
        return time.monotonic()-start

with ThreadPoolExecutor(max_workers=2) as pool:
    f1=pool.submit(first); f2=pool.submit(second)
    assert f1.result(timeout=12)=="committed"
    waited=f2.result(timeout=12)
assert waited>0.6, f"second order did not wait for inventory lock: {waited:.3f}s"

with psycopg.connect(DSN,autocommit=True) as c:
    total,reserved,holds=c.execute("""
      SELECT inv.total_stock, public.lod_crocante_active_reserved(inv.item_key),
             (SELECT count(*) FROM public.crocante_inventory_holds WHERE item_key=inv.item_key AND state='held')
      FROM public.crocante_inventory inv WHERE inv.item_key=%s
    """,(KEY,)).fetchone()
    assert (total,reserved,holds)==(3,2,1), (total,reserved,holds)
print("TRUFADAS_PMG_CONCURRENT_RESERVATION_PASS")
