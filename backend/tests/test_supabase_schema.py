"""Supabase Postgres schema verification via psycopg2 pooler."""
import os
import pytest
import urllib.parse

try:
    import psycopg2  # type: ignore
except Exception:  # pragma: no cover
    psycopg2 = None

EXPECTED_TABLES = {
    "profiles", "food_logs", "weight_logs",
    "habits", "meal_plans", "coach_messages", "weekly_reports",
}

DB_HOST = "aws-1-ap-northeast-1.pooler.supabase.com"
DB_PORT = 6543
DB_NAME = "postgres"
DB_USER = "postgres.ghglnlyopnemxxnlomvj"
DB_PASS = "Prantik#1995"


@pytest.fixture(scope="module")
def pg_conn():
    if psycopg2 is None:
        pytest.skip("psycopg2 not installed")
    last_err = None
    for port in (6543, 5432):
        try:
            conn = psycopg2.connect(
                host=DB_HOST, port=port, dbname=DB_NAME,
                user=DB_USER, password=DB_PASS,
                connect_timeout=15, sslmode="require",
            )
            yield conn
            conn.close()
            return
        except Exception as e:
            last_err = e
            continue
    pytest.skip(f"Could not connect to Supabase pooler: {last_err}")


def test_schema_tables_present(pg_conn):
    with pg_conn.cursor() as cur:
        cur.execute(
            "select table_name from information_schema.tables "
            "where table_schema='public' and table_type='BASE TABLE'"
        )
        present = {row[0] for row in cur.fetchall()}
    missing = EXPECTED_TABLES - present
    assert not missing, f"Missing tables: {missing}. Present: {present}"


def test_rls_enabled_on_user_tables(pg_conn):
    with pg_conn.cursor() as cur:
        cur.execute(
            "select tablename, rowsecurity from pg_tables "
            "where schemaname='public' and tablename = ANY(%s)",
            (list(EXPECTED_TABLES),),
        )
        rows = cur.fetchall()
    by_table = {t: rls for t, rls in rows}
    no_rls = [t for t in EXPECTED_TABLES if not by_table.get(t)]
    assert not no_rls, f"RLS not enabled on: {no_rls}"


def test_profiles_columns(pg_conn):
    with pg_conn.cursor() as cur:
        cur.execute(
            "select column_name from information_schema.columns "
            "where table_schema='public' and table_name='profiles'"
        )
        cols = {row[0] for row in cur.fetchall()}
    must_have = {
        "id", "email", "name", "age", "gender", "height_cm",
        "current_weight_kg", "goal_weight_kg", "activity_level",
        "diet_pref", "cuisine", "budget_monthly", "aggressiveness",
        "daily_calorie_target", "daily_protein_target", "onboarded",
        "role", "subscription_tier",
    }
    missing = must_have - cols
    assert not missing, f"profiles missing cols: {missing}"
