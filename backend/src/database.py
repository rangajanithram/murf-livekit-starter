import sqlite3
import logging
from datetime import datetime
import os
import json

logger = logging.getLogger("database")

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "lexi_memory.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT,
            language_preference TEXT,
            current_level TEXT,
            topics_covered TEXT,
            mistakes TEXT,
            last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create escalations table for Day 7 Hand-off
    c.execute('''
        CREATE TABLE IF NOT EXISTS escalations (
            escalation_id TEXT PRIMARY KEY,
            user_id TEXT,
            summary TEXT,
            urgency TEXT,
            language TEXT,
            follow_up_method TEXT,
            phone_number TEXT,
            status TEXT DEFAULT 'OPEN',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create FTS5 table for RAG knowledge base
    c.execute('''
        CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_base USING fts5(
            topic,
            content
        )
    ''')
    
    # Populate knowledge base if empty
    c.execute("SELECT count(*) FROM knowledge_base")
    if c.fetchone()[0] == 0:
        logger.info("Populating knowledge base...")
        kb_path = os.path.join(os.path.dirname(__file__), "knowledge.json")
        if os.path.exists(kb_path):
            with open(kb_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    c.execute("INSERT INTO knowledge_base (topic, content) VALUES (?, ?)", (item['topic'], item['content']))
    
    conn.commit()
    conn.close()
    logger.info("Database initialized.")

def save_user(user_id: str, name: str, language_preference: str, current_level: str, topics_covered: str, mistakes: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        INSERT INTO users (user_id, name, language_preference, current_level, topics_covered, mistakes, last_interaction)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            name=excluded.name,
            language_preference=excluded.language_preference,
            current_level=excluded.current_level,
            topics_covered=excluded.topics_covered,
            mistakes=excluded.mistakes,
            last_interaction=CURRENT_TIMESTAMP
    ''', (user_id.lower(), name, language_preference, current_level, topics_covered, mistakes))
    conn.commit()
    conn.close()
    logger.info(f"Saved profile for user: {user_id}")

def get_user(user_id: str):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE user_id = ?", (user_id.lower(),))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def delete_user(user_id: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT name FROM users WHERE user_id = ?", (user_id.lower(),))
    row = c.fetchone()
    if row:
        c.execute("DELETE FROM users WHERE user_id = ?", (user_id.lower(),))
        conn.commit()
        conn.close()
        logger.info(f"Deleted profile for user: {user_id}")
        return True
    conn.close()
    return False

def search_knowledge(query: str):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Perform an FTS5 MATCH query. We append a wildcard to each word for better partial matching.
    # We strip special chars to prevent FTS syntax errors.
    clean_query = "".join(ch if ch.isalnum() else " " for ch in query).strip()
    if not clean_query:
        return []
        
    fts_query = " OR ".join([f"{word}*" for word in clean_query.split()])
    
    try:
        c.execute("SELECT topic, content FROM knowledge_base WHERE knowledge_base MATCH ? ORDER BY rank LIMIT 3", (fts_query,))
        results = [dict(row) for row in c.fetchall()]
    except Exception as e:
        logger.error(f"FTS search error: {e}")
        results = []
        
    conn.close()
    return results

def save_escalation(user_id: str, summary: str, urgency: str, language: str, follow_up_method: str, phone_number: str = None):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Advanced feature: Stop duplicate requests. Check if an OPEN request exists for this user.
    c.execute("SELECT escalation_id, summary FROM escalations WHERE user_id = ? AND status = 'OPEN'", (user_id.lower(),))
    existing = c.fetchone()
    
    if existing:
        esc_id = existing[0]
        # Append new summary to existing
        new_summary = f"{existing[1]}\n[UPDATE]: {summary}"
        c.execute('''
            UPDATE escalations 
            SET summary = ?, urgency = ?, language = ?, follow_up_method = ?, phone_number = ?, created_at = CURRENT_TIMESTAMP
            WHERE escalation_id = ?
        ''', (new_summary, urgency, language, follow_up_method, phone_number, esc_id))
        conn.commit()
        conn.close()
        logger.info(f"Updated existing escalation {esc_id} for user: {user_id}")
        return esc_id
    else:
        # Create new request
        import uuid
        # Generate a short friendly ID like REQ-8A4F
        esc_id = f"REQ-{uuid.uuid4().hex[:4].upper()}"
        
        c.execute('''
            INSERT INTO escalations (escalation_id, user_id, summary, urgency, language, follow_up_method, phone_number, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
        ''', (esc_id, user_id.lower(), summary, urgency, language, follow_up_method, phone_number))
        conn.commit()
        conn.close()
        logger.info(f"Created new escalation {esc_id} for user: {user_id}")
        return esc_id

def get_escalations():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM escalations ORDER BY created_at DESC")
    results = [dict(row) for row in c.fetchall()]
    conn.close()
    return results

def get_escalation_status(esc_id: str):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT status FROM escalations WHERE escalation_id = ?", (esc_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return row['status']
    return "Not Found"

def resolve_escalation(esc_id: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE escalations SET status = 'RESOLVED' WHERE escalation_id = ?", (esc_id,))
    conn.commit()
    conn.close()
    return True


