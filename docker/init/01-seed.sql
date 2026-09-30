--
-- PostgreSQL database dump
--

-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: api-agente; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "api-agente";


--
-- Name: enum_invoices_status; Type: TYPE; Schema: api-agente; Owner: -
--

CREATE TYPE "api-agente".enum_invoices_status AS ENUM (
    'draft',
    'issued',
    'paid',
    'cancelled'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: invoices; Type: TABLE; Schema: api-agente; Owner: -
--

CREATE TABLE "api-agente".invoices (
    id integer NOT NULL,
    number character varying(255) NOT NULL,
    "userId" integer NOT NULL,
    "customerName" character varying(255) NOT NULL,
    amount numeric(12,2) NOT NULL,
    status "api-agente".enum_invoices_status NOT NULL,
    "issuedAt" timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: api-agente; Owner: -
--

CREATE SEQUENCE "api-agente".invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: api-agente; Owner: -
--

ALTER SEQUENCE "api-agente".invoices_id_seq OWNED BY "api-agente".invoices.id;


--
-- Name: users; Type: TABLE; Schema: api-agente; Owner: -
--

CREATE TABLE "api-agente".users (
    id integer NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    "passwordHash" character varying(255) NOT NULL,
    role character varying(255) DEFAULT 'regular'::character varying NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['regular'::character varying, 'admin'::character varying, 'superadmin'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: api-agente; Owner: -
--

CREATE SEQUENCE "api-agente".users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: api-agente; Owner: -
--

ALTER SEQUENCE "api-agente".users_id_seq OWNED BY "api-agente".users.id;


--
-- Name: invoices id; Type: DEFAULT; Schema: api-agente; Owner: -
--

ALTER TABLE ONLY "api-agente".invoices ALTER COLUMN id SET DEFAULT nextval('"api-agente".invoices_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: api-agente; Owner: -
--

ALTER TABLE ONLY "api-agente".users ALTER COLUMN id SET DEFAULT nextval('"api-agente".users_id_seq'::regclass);


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: api-agente; Owner: -
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: api-agente; Owner: -
--



--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: api-agente; Owner: -
--



--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: api-agente; Owner: -
--



--
-- Name: invoices invoices_number_key; Type: CONSTRAINT; Schema: api-agente; Owner: -
--

ALTER TABLE ONLY "api-agente".invoices
    ADD CONSTRAINT invoices_number_key UNIQUE (number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: api-agente; Owner: -
--

ALTER TABLE ONLY "api-agente".invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: api-agente; Owner: -
--

ALTER TABLE ONLY "api-agente".users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: api-agente; Owner: -
--

ALTER TABLE ONLY "api-agente".users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: api-agente; Owner: -
--

ALTER TABLE ONLY "api-agente".users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: invoices invoices_userId_fkey; Type: FK CONSTRAINT; Schema: api-agente; Owner: -
--

ALTER TABLE ONLY "api-agente".invoices
    ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "api-agente".users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

