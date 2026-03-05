# Supply Chain AI - Demonstration Script

This guide explains how to run key scenarios using the files in this folder to demonstrate the advanced capabilities of the Agentic Architecture.

## Setup

Reset the application data by refreshing the browser so the in-memory store is completely blank.

---

### Test 1: "The Clean Room" (Data Resilience)

**The Capability:** Handling unstructured or dirty data inputs seamlessly.
**The Test:**

1. Go to the **Suppliers** page.
2. Upload `1_dirty_suppliers.csv`.
3. Open the file to show that `lead_time` has "days" written in it, and `cost_index` has `$1,500.00` and `€850.25`.
4. **Watch the AI succeed:** The application will ingest the file, scrub the data using regex, and the Supplier Agent will accurately calculate composite scores.

---

### Test 2: AI Column Mapping (Semantic Agility)

**The Capability:** Dynamically mapping non-standard CSV headers to the expected schema.
**The Test:**

1. Go to the **Inventory** page.
2. Upload `2_messy_headers_inventory.csv`.
3. Point out that the headers use different naming conventions (`Item Serial Code` instead of `sku`, `Warehouse Boxes Current` instead of `on_hand`).
4. **Watch the AI succeed:** The backend will fire an LLM prompt to map the headers semantically, seamlessly convert them to the correct schema in RAM, and load the data successfully.

---

### Test 3: Historical Conflict Detection (Proactive Monitoring)

**The Capability:** Tracking temporal changes and alerting on sudden dips in inventory.
**The Test:**

1. Clear data. Go to the **Inventory** page.
2. Upload `3a_history_inventory.csv` (Copper Wire is at 500 units).
3. Wait 10 seconds.
4. Upload `3b_history_drop_inventory.csv` (Copper Wire drops to 10 units).
5. Open the **Dashboard**.
6. **Watch the AI succeed:** In the Live Alerts, you will see a **"HISTORICAL CONFLICT"** warning specifically noting that SKU-102 dropped from 500 to 10 units since the last upload, demonstrating proactive anomaly detection.

---

### Test 4: Dynamic Urgency Scoring (Contextual Routing)

**The Capability:** Adjusting operational weights and logic based on conversational intent.
**The Test:**

1. Go to the **Query** page. Make sure `1_dirty_suppliers.csv` is uploaded.
2. Ask: _"Who is the best supplier?"_
   - Notice how the AI prioritizes the cheapest supplier based on the default weighting (e.g., 40% Cost / 10% Speed).
3. Now ask: _"Who is the cheapest supplier for an URGENT EMERGENCY rush order?"_
4. **Watch the AI succeed:** The intent parser will detect urgency, dynamically adjust the scoring weights (e.g., Cost 10% / Speed 45%), and recommend a faster supplier like `Gamma FastTrack`.

---

### Test 5: Cascade Risk Detection (Cross-Dataset Insight)

**The Capability:** Identifying secondary downstream risks by connecting multiple operational domains.
**The Test:**

1. Go to **Inventory** and upload `5a_cascade_inventory.csv` (Only 30 units of SKU-999 remain, demanding 10/day. It will run out in 3 days).
2. Go to **Shipments** and upload `5b_cascade_shipments.csv` (The shipment for SKU-999 is delayed by 5 days).
3. Open the **Dashboard**.
4. **Watch the AI succeed:** You will see a **"CRITICAL CASCADE RISK"** alert. The Shipment Agent actively queried the Inventory data and realized the factory will run out of stock before the delayed truck arrives.

---

### Test 6: Structured Live RAG Injection

**The Capability:** Grounding qualitative document search (RAG) with real-time quantitative data.
**The Test:**

1. Go to **Documents** and upload `6_copper_wire_policy.txt`.
2. Go to **Inventory** and upload `3a_history_inventory.csv` (Confirm Copper wire has 500 units on hand).
3. Go to the **Query** page.
4. Ask: _"Based on the attached policy and my current stock levels, am I authorized to run the 'High Output' line for Copper Wire right now?"_
5. **Watch the AI succeed:** The system injects the live inventory numbers into the RAG context. The LLM reads the policy requirement (>400 units), checks the live data (500 units), and authorizes the action.

---

### Test 7: The "Ghost SKU" Exception Handling (Forgiving Architecture)

**The Capability:** Gracefully handling partial or missing data linkages without crashing the system.
**The Test:**

1. Clear data. Go to the **Inventory** page and upload `3a_history_inventory.csv`.
2. Go to the **Shipments** page and upload `7_ghost_shipment.csv`. Notice the file contains `SKU-GHOST`, which does not exist in the inventory.
3. **Watch the AI succeed:** The backend handles the unknown SKU smoothly. On the **Query** page, if you ask: _"Summarize our incoming shipments,"_ the AI cross-references the live Inventory, notes `SKU-GHOST` is unregistered, and provides a helpful warning to review the item.

---

### Test 8: Unstructured Data Cross-Referencing

**The Capability:** Comparing unstructured legal text against structured quantitative data.
**The Test:**

1. Go to the **Suppliers** page and upload `1_dirty_suppliers.csv`. (Note: Gamma FastTrack's `on_time_rate` is `0.99`).
2. Go to the **Documents** page and upload `8_gamma_contract.txt`.
3. Go to the **Query** page.
4. Ask: _"Based on the attached Master Service Level Agreement, is Gamma FastTrack currently in breach of contract regarding their performance?"_
5. **Watch the AI succeed:** The Orchestrator extracts the SLA rule from the text (e.g., requires >0.98 on-time rate), pulls the live CSV data for Gamma FastTrack (0.99), compares them, and confirms they are compliant.

---

### Test 9: Multi-Agent Scenario Response

**The Capability:** Deploying multiple specialized agents simultaneously for systemic queries.
**The Test:**

1. Upload base CSVs (`3a`, `1`, `5b`).
2. Go to the **Query** page.
3. Type: _"Our East Wing warehouse just had a massive roof collapse. Give me a full disaster recovery breakdown: What inventory is trapped there, and what incoming shipments are heading there that we need to immediately intercept?"_
4. **Watch the AI succeed:** The routing engine detects a multi-domain shock and simultaneously triggers both the `InventoryAgent` and the `ShipmentAgent` to filter their respective datasets for 'East Wing' and synthesize a comprehensive emergency response plan.

---

### Test 10: Advanced Mathematical Forecasting

**The Capability:** Using LLM reasoning to perform novel quantitative supply chain forecasts based on sudden hypothetical parameters.
**The Test:**

1. Clear data. Upload `3a_history_inventory.csv`.
2. Go to the **Query** page. Copper Wire has 500 units on hand, and normal demand is 10/day.
3. Ask the AI: _"Assume a viral trend causes our daily demand for Copper Wire to instantly spike by 300%. Exactly how many days until we run completely out of stock?"_
4. **Watch the AI succeed:** The LLM applies the hypothetical 300% spike to the base demand and accurately divides the current stock by the newly calculated burn rate to output the exact days remaining.

---

### Test 11: "Seasonal Fluidity" (Dynamic What-If Analysis)

**The Capability:** Running situational forecasting without modifying the underlying master data.
**The Test:**

1. Make sure `3a_history_inventory.csv` is uploaded.
2. Ask the Orchestrator: _"Calculate my Economic Order Quantity for SKU-102."_ Let it output the standard EOQ based on the normal demand.
3. Now, type: _"Recalculate my Economic Order Quantity for SKU-102, assuming it is currently the absolute peak of the Winter Holiday season."_
4. **Watch the AI succeed:** The application dynamically applies a seasonal multiplier to the base demand in memory to generate a completely new EOQ specifically for that hypothetical scenario, leaving the source data untouched.
