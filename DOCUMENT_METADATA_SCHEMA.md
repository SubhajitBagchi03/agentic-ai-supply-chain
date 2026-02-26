# Document Metadata Schema

## Purpose

Metadata enables accurate retrieval, filtering, and contextual understanding within the RAG system.

Each document and chunk must include metadata.

---

## Required Fields

| Field            | Type     | Description                          |
| ---------------- | -------- | ------------------------------------ |
| document_id      | string   | Unique identifier                    |
| file_name        | string   | Original file name                   |
| document_type    | string   | Contract, delivery note, report, etc |
| upload_timestamp | datetime | Upload time                          |
| source           | string   | Upload source                        |
| version          | string   | Document version                     |

---

## Contextual Fields

| Field             | Type   | Description         |
| ----------------- | ------ | ------------------- |
| supplier_name     | string | Supplier reference  |
| product_reference | string | Related product     |
| contract_id       | string | Contract identifier |
| date_range        | string | Applicable period   |
| department        | string | Origin department   |

---

## Retrieval Fields

| Field         | Type    | Description      |
| ------------- | ------- | ---------------- |
| chunk_id      | string  | Chunk identifier |
| embedding_id  | string  | Vector reference |
| page_number   | integer | Source page      |
| section_title | string  | Section label    |

---

## Optional Fields

| Field          | Type    | Description              |
| -------------- | ------- | ------------------------ |
| priority_level | string  | High/medium/low          |
| risk_flag      | boolean | Indicates risk relevance |
| notes          | string  | Additional context       |

---

## Example Metadata Record

document_id: DOC_001
file_name: supplier_contract_A.pdf
document_type: contract
supplier_name: Supplier A
upload_timestamp: 2026-01-10T10:00:00
page_number: 3
section_title: Delivery Terms

---

## Metadata Principles

- Must be consistent
- Must support filtering
- Must enable traceability
- Must aid explainability

---
