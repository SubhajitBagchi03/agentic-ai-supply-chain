# Supply Chain AI - Killer Presentation Script

This guide explains exactly how to run the 6 killer scenarios using the files in this folder to prove the superiority of the Stateless Agentic Architecture.

## Setup

Reset the application data by refreshing the browser so the in-memory Pandas store is completely blank.

---

### Test 1: "The Clean Room" (Proving Resilience to Bad Data)

**The Argument:** Rigid SQL databases crash when users type currency symbols into number fields.
**The Test:**

1. Go to the **Suppliers** page.
2. Upload `1_dirty_suppliers.csv`.
3. Open the file to show your leader that `lead_time` has "days" written in it, and `cost_index` has `$1,500.00` and `€850.25`.
4. **Watch the AI succeed:** The app will flawlessly ingest it, scrub the data using regex, and the Supplier Agent will accurately calculate composite scores without dropping a sweat.

---

### Test 2: AI Column Mapping (Proving Semantic Agility)

**The Argument:** Traditional databases force exactly rigid CSV headers.
**The Test:**

1. Go to the **Inventory** page.
2. Upload `2_messy_headers_inventory.csv`.
3. Point out that the headers are completely wrong (`Item Serial Code` instead of `sku`, `Warehouse Boxes Current` instead of `on_hand`).
4. **Watch the AI succeed:** The backend will pause, fire a zero-shot Llama-3 prompt to map the headers semantically, seamlessly convert them to the correct schema in RAM, and load the data successfully.

---

### Test 3: Historical Conflict Detection (Proving Proactive History)

**The Argument:** Postgres safely tracks history, while Stateless loses it.
**The Test:**

1. Clear data. Go to the **Inventory** page.
2. Upload `3a_history_inventory.csv` (Copper Wire is at 500 units).
3. Wait 10 seconds.
4. Upload `3b_history_drop_inventory.csv` (Copper Wire drops to 10 units).
5. Open the **Dashboard**.
6. **Watch the AI succeed:** In the Live Alerts, you will see a massive **"HISTORICAL CONFLICT"** warning specifically calling out that SKU-102 plummeted from 500 to 10 units since the last upload. Explain that this is the Hybrid SQLite ledger proactively alerting the AI.

---

### Test 4: Dynamic Urgency Scoring (Proving Contextual Routing)

**The Argument:** SQL uses hardcoded mathematical queries; the LLM uses fluid contextual reasoning.
**The Test:**

1. Go to the **Query** page. Make sure `1_dirty_suppliers.csv` is uploaded.
2. Ask: _"Who is the best supplier?"_
   - Notice how the AI prioritizes the cheapest supplier based on the default 40% Cost / 10% Speed weighting.
3. Now ask: _"Who is the cheapest supplier for an URGENT EMERGENCY rush order?"_
   - **Watch the AI succeed:** The intent parser will detect urgency, dynamically flip the math (Cost 10% / Speed 45%), and recommend `Gamma FastTrack` because they take only 3 days.

---

### Test 5: Cascade Risk Detection (Proving Cross-Dataset Insight)

**The Argument:** Databases silo tables.
**The Test:**

1. Go to **Inventory** and upload `5a_cascade_inventory.csv` (You only have 30 units of SKU-999, demanding 10/day. It will run out in 3 days).
2. Go to **Shipments** and upload `5b_cascade_shipments.csv` (The truck carrying SKU-999 is delayed by 5 days).
3. Open the **Dashboard**.
4. **Watch the AI succeed:** You will see a **"CRITICAL CASCADE RISK"** alert. The Shipment Agent actively queried the live Inventory memory block and realized the factory will run out of stock exactly 2 days before the delayed truck arrives.

---

### Test 6: Structured Live RAG Injection (The Ultimate Weapon)

**The Argument:** RAG only reads PDFs, it doesn't know live numbers.
**The Test:**

1. Go to **Documents** and upload `6_copper_wire_policy.txt`.
2. Go to **Inventory** and upload `3a_history_inventory.csv` (Confirm Copper wire has 500 units on hand).
3. Go to the **Query** page.
4. Ask: _"Based on the attached policy and my current stock levels, am I authorized to run the 'High Output' line for Copper Wire right now?"_
5. **Watch the AI succeed:** Your custom `_inventory_to_text_chunks` function injects the exact live number into the RAG engine. The LLM will read the PDF, see that you need >400 units, read the injected Pandas text, see you have 500 units, and confidently approve the action!

---

### Test 7: The "Ghost SKU" Constraint Bypass (Proving Forgiving Architecture)

**The Argument:** In her PostgreSQL database, uploading a shipment containing a SKU that doesn't exist in the formal Inventory table immediately triggers a `Foreign Key Constraint Violation`, hard-crashing the upload and locking the user out.
**The Test:**

1. Clear data. Go to the **Inventory** page and upload `3a_history_inventory.csv`.
2. Go to the **Shipments** page and upload `7_ghost_shipment.csv`. Notice the file contains `SKU-GHOST`, which does not exist in the inventory.
3. **Watch the AI succeed:** The Stateless backend will accept the file perfectly without crashing. If you go to the **Query** page and ask: _"Summarize our incoming shipments,"_ the Shipment Agent cross-references the live Inventory table, realizes `SKU-GHOST` is unregistered, and naturally warns you: _"Warning: Shipment SHP-404 contains SKU-GHOST, which does not exist in our main inventory platform. Please verify if this is an unregistered sample."_
   - **The Mic-Drop:** "My AI handles data anomalies gracefully and tells the human to review it. Your database just crashes with a 500 Server Error."

---

### Test 8: Unstructured Data "Smashing" (Proving Non-Relational Processing)

**The Argument:** SQL Databases only do math on tables. You can't run a SQL `JOIN` on a 5-page PDF document.
**The Test:**

1. Go to the **Suppliers** page and upload `1_dirty_suppliers.csv`. (Note: Gamma FastTrack's `on_time_rate` is `0.99`).
2. Go to the **Documents** page and upload `8_gamma_contract.txt`.
3. Go to the **Query** page.
4. Ask: _"Based on the attached Master Service Level Agreement, is Gamma FastTrack currently in breach of contract regarding their performance?"_
5. **Watch the AI succeed:** The Orchestrator takes the unstructured blob of contract text, extracts the rule (Needs >0.98 on-time rate), pulls the live CSV Pandas data for Gamma FastTrack (0.99), compares them simultaneously, and answers: _"No, Gamma FastTrack is currently compliant with an on-time rate of 0.99, which exceeds the contract requirement of 0.98."_
   - **The Mic-Drop:** "I just executed a relational database JOIN between a raw CSV stream and an unstructured text document. You literally cannot do that in Postgres."

---

### Test 9: Multi-Agent "Disaster Recovery" (Proving Systemic Intelligence)

**The Argument:** To get a systemic view of an enterprise in a traditional DB, the engineers must pre-build dedicated BI dashboards or write massive multi-JOIN SQL queries that span 5 tables.
**The Test:**

1. Upload all your base CSVs (`3a`, `1`, `5b`).
2. Go to the **Query** page.
3. Type the ultimate panic scenario: _"Our East Wing warehouse just had a massive roof collapse. Give me a full disaster recovery breakdown: What inventory is trapped there, and what incoming shipments are heading there that we need to immediately intercept?"_
4. **Watch the AI succeed:** The Orchestrator's Natural Language Intent Router will detect a multi-domain systemic shock. It will simultaneously trigger the `InventoryAgent` (to isolate all stock where `warehouse == 'East Wing'`) AND trigger the `ShipmentAgent` (to isolate all routing where `destination == 'East Wing'`). It will then fuse the two isolated Pandas DataFrames into a single, comprehensive emergency response plan.
   - **The Mic-Drop:** "I didn't have to write a new SQL query or build a custom dashboard card for a roof collapse. The Agentic framework dynamically built the exact SQL JOIN equivalent in RAM just by understanding my English."

---

### Test 10: "Hallucination by Math" (Proving ROUGE/BLEU Evaluators are Flawed)

**The Argument:** In her documentation, she states she uses ROUGE and BLEU scores to evaluate if her AI is hallucinating. However, ROUGE/BLEU are basic string-matching tools; they penalize the AI if it outputs a word/number that wasn't exactly written in the source document.
**The Test:**

1. Clear data. Upload `3a_history_inventory.csv`.
2. Go to the **Query** page. Copper Wire has 500 units on hand, and normal demand is 10/day.
3. Ask the AI: _"Assume a viral TikTok campaign causes our daily demand for Copper Wire to instantly spike by 300%. Exactly how many days until we run completely out of stock?"_
4. **Watch the AI succeed:** Your LLM will do the math: Normal demand (10) + 300% spike (30) = 40 demand/day. 500 units / 40 demand = **12.5 days**. It will confidently answer "12.5 days".
   - **The Mic-Drop:** "My AI just autonomously generated a predictive mathematical statistic—12.5 days. Because the number '12.5' never physically appeared in the CSV, your ROUGE/BLEU evaluation pipeline would instantly fail this generated answer and falsely flag it as a 'Hallucination.' Because you use string-matching NLP metrics, your system physically cannot perform predictive supply chain math."

---

### Test 11: "Seasonal Fluidity" (Proving Static Database Weakness)

**The Argument:** Her PostgreSQL DB permanently stores `avg_daily_consumption` in a hardcoded table row, as she specified in her code. To adjust it for a single "what-if" scenario, you have to run a destructive `UPDATE` SQL query on the master data.
**The Test:**

1. Make sure `3a_history_inventory.csv` is still uploaded.
2. Ask the Orchestrator: _"Calculate my Economic Order Quantity for SKU-102."_ Let it output the standard EOQ based on the normal demand of 10.
3. Now, type: _"Recalculate my Economic Order Quantity for SKU-102, assuming it is currently the absolute peak of the Winter Holiday season (December)."_
4. **Watch the AI succeed:** Because you built the "Seasonal Demand Multiplier" into the Inventory Agent's Python script, it will dynamically apply a heavy 1.5x holiday multiplier to the base demand strictly in RAM, and generate a completely different, higher EOQ.
   - **The Mic-Drop:** "Your database forces you to permanently overwrite the `avg_daily_consumption` row just to forecast a single holiday season. My system uses an Agentic python overlay to dynamically calculate fluid 'What-If' scenarios completely in memory, leaving the master data untouched."
