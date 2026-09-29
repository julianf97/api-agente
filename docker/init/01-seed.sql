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

COPY "api-agente".invoices (id, number, "userId", "customerName", amount, status, "issuedAt", "createdAt", "updatedAt") FROM stdin;
52	09040-00000001	40	Electromecánica del Norte S.R.L.	514299.77	issued	2026-07-22 10:00:00-03	2026-07-22 10:00:00-03	2026-07-22 10:00:00-03
53	09040-00000002	40	Alimentos del Camino S.R.L.	522218.14	issued	2026-07-24 11:00:00-03	2026-07-24 11:00:00-03	2026-07-24 11:00:00-03
54	09040-00000003	40	Servicios Industriales del Litoral S.A.	530137.51	issued	2026-07-26 12:00:00-03	2026-07-26 12:00:00-03	2026-07-26 12:00:00-03
55	09040-00000004	40	Metalúrgica Belgrano S.R.L.	538056.88	paid	2026-07-28 13:00:00-03	2026-07-28 13:00:00-03	2026-07-28 13:00:00-03
56	09040-00000005	40	Bazar La Esquina S.R.L.	545975.25	paid	2026-07-30 14:00:00-03	2026-07-30 14:00:00-03	2026-07-30 14:00:00-03
57	09040-00000006	40	Tecnología del Litoral S.A.	553894.62	paid	2026-08-01 15:00:00-03	2026-08-01 15:00:00-03	2026-08-01 15:00:00-03
58	09040-00000007	40	Frutos de la Ribera S.R.L.	561813.99	paid	2026-08-03 16:00:00-03	2026-08-03 16:00:00-03	2026-08-03 16:00:00-03
59	09040-00000008	40	Construcciones del Acuerdo S.A.	569732.36	paid	2026-08-05 09:00:00-03	2026-08-05 09:00:00-03	2026-08-05 09:00:00-03
60	09040-00000009	40	Muebles del Centro S.R.L.	577651.73	paid	2026-08-07 10:00:00-03	2026-08-07 10:00:00-03	2026-08-07 10:00:00-03
61	09040-00000010	40	Vivero Las Acacias	585570.10	paid	2026-08-09 11:00:00-03	2026-08-09 11:00:00-03	2026-08-09 11:00:00-03
62	09040-00000011	40	Obras y Montajes del Río S.A.	593489.47	paid	2026-08-11 12:00:00-03	2026-08-11 12:00:00-03	2026-08-11 12:00:00-03
63	09040-00000012	40	Agroinsumos del Norte S.A.	601408.84	draft	\N	2026-08-13 13:00:00-03	2026-08-13 13:00:00-03
64	09040-00000013	40	Estudio Contable Mitre y Asociados	609327.21	cancelled	2026-08-15 14:00:00-03	2026-08-15 14:00:00-03	2026-08-15 14:00:00-03
65	09040-00000014	40	Textiles Costanera S.A.	617246.58	issued	2026-08-17 15:00:00-03	2026-08-17 15:00:00-03	2026-08-17 15:00:00-03
66	09040-00000015	40	Clínica Veterinaria Los Tilos	625165.95	issued	2026-08-19 16:00:00-03	2026-08-19 16:00:00-03	2026-08-19 16:00:00-03
67	09040-00000016	40	Distribuidora Arroyo Seco S.R.L.	633084.32	issued	2026-08-21 09:00:00-03	2026-08-21 09:00:00-03	2026-08-21 09:00:00-03
68	09040-00000017	40	Logística del Puerto S.A.	641003.69	paid	2026-08-23 10:00:00-03	2026-08-23 10:00:00-03	2026-08-23 10:00:00-03
69	09040-00000018	40	Cooperativa Gráfica del Paraná	648922.06	paid	2026-08-25 11:00:00-03	2026-08-25 11:00:00-03	2026-08-25 11:00:00-03
70	09040-00000019	40	Café Plaza Mayor S.R.L.	656841.43	paid	2026-08-27 12:00:00-03	2026-08-27 12:00:00-03	2026-08-27 12:00:00-03
71	09040-00000020	40	Ferretería del Paraná S.R.L.	664760.80	paid	2026-08-29 13:00:00-03	2026-08-29 13:00:00-03	2026-08-29 13:00:00-03
72	09040-00000021	40	La Ribera Provisiones S.R.L.	672679.17	paid	2026-08-31 14:00:00-03	2026-08-31 14:00:00-03	2026-08-31 14:00:00-03
73	09040-00000022	40	Insumos Médicos del Sur S.A.	680598.54	paid	2026-09-02 15:00:00-03	2026-09-02 15:00:00-03	2026-09-02 15:00:00-03
74	09040-00000023	40	Repuestos del Oeste S.R.L.	688517.91	paid	2026-09-04 16:00:00-03	2026-09-04 16:00:00-03	2026-09-04 16:00:00-03
75	09040-00000024	40	Laboratorio La Estación S.R.L.	696436.28	paid	2026-09-06 09:00:00-03	2026-09-06 09:00:00-03	2026-09-06 09:00:00-03
76	09040-00000025	40	Pinturería Las Barrancas S.R.L.	704355.65	draft	\N	2026-09-08 10:00:00-03	2026-09-08 10:00:00-03
77	09040-00000026	40	Transporte Dos Ríos S.R.L.	712274.02	cancelled	2026-09-10 11:00:00-03	2026-09-10 11:00:00-03	2026-09-10 11:00:00-03
78	09040-00000027	40	Hotel del Parque S.R.L.	720193.39	issued	2026-09-12 12:00:00-03	2026-09-12 12:00:00-03	2026-09-12 12:00:00-03
79	09040-00000028	40	Papelería Sarmiento S.R.L.	728112.76	issued	2026-09-14 13:00:00-03	2026-09-14 13:00:00-03	2026-09-14 13:00:00-03
80	09040-00000029	40	Talleres Rivadavia S.R.L.	736031.13	issued	2026-09-16 14:00:00-03	2026-09-16 14:00:00-03	2026-09-16 14:00:00-03
81	09040-00000030	40	Panificados San Pedro S.R.L.	743950.50	paid	2026-09-18 15:00:00-03	2026-09-18 15:00:00-03	2026-09-18 15:00:00-03
82	09040-00000031	40	Electromecánica del Norte S.R.L.	751869.87	paid	2026-09-20 16:00:00-03	2026-09-20 16:00:00-03	2026-09-20 16:00:00-03
83	09040-00000032	40	Alimentos del Camino S.R.L.	759788.24	paid	2026-09-22 09:00:00-03	2026-09-22 09:00:00-03	2026-09-22 09:00:00-03
84	09040-00000033	40	Servicios Industriales del Litoral S.A.	767707.61	paid	2026-06-11 10:00:00-03	2026-06-11 10:00:00-03	2026-06-11 10:00:00-03
85	09040-00000034	40	Metalúrgica Belgrano S.R.L.	775626.98	paid	2026-06-13 11:00:00-03	2026-06-13 11:00:00-03	2026-06-13 11:00:00-03
86	09040-00000035	40	Bazar La Esquina S.R.L.	783545.35	paid	2026-06-15 12:00:00-03	2026-06-15 12:00:00-03	2026-06-15 12:00:00-03
87	09040-00000036	40	Tecnología del Litoral S.A.	791464.72	paid	2026-06-17 13:00:00-03	2026-06-17 13:00:00-03	2026-06-17 13:00:00-03
88	09040-00000037	40	Frutos de la Ribera S.R.L.	799383.09	paid	2026-06-19 14:00:00-03	2026-06-19 14:00:00-03	2026-06-19 14:00:00-03
89	09040-00000038	40	Construcciones del Acuerdo S.A.	807302.46	draft	\N	2026-06-21 15:00:00-03	2026-06-21 15:00:00-03
90	09040-00000039	40	Muebles del Centro S.R.L.	815221.83	cancelled	2026-06-23 16:00:00-03	2026-06-23 16:00:00-03	2026-06-23 16:00:00-03
91	09040-00000040	40	Vivero Las Acacias	823140.20	issued	2026-06-25 09:00:00-03	2026-06-25 09:00:00-03	2026-06-25 09:00:00-03
92	09040-00000041	40	Obras y Montajes del Río S.A.	831059.57	issued	2026-06-27 10:00:00-03	2026-06-27 10:00:00-03	2026-06-27 10:00:00-03
93	09040-00000042	40	Agroinsumos del Norte S.A.	838978.94	issued	2026-06-29 11:00:00-03	2026-06-29 11:00:00-03	2026-06-29 11:00:00-03
94	09040-00000043	40	Estudio Contable Mitre y Asociados	846897.31	paid	2026-07-01 12:00:00-03	2026-07-01 12:00:00-03	2026-07-01 12:00:00-03
95	09042-00000001	42	Hotel del Parque S.R.L.	538993.99	issued	2026-07-24 10:00:00-03	2026-07-24 10:00:00-03	2026-07-24 10:00:00-03
96	09042-00000002	42	Papelería Sarmiento S.R.L.	546912.36	paid	2026-07-26 11:00:00-03	2026-07-26 11:00:00-03	2026-07-26 11:00:00-03
97	09042-00000003	42	Talleres Rivadavia S.R.L.	554831.73	paid	2026-07-28 12:00:00-03	2026-07-28 12:00:00-03	2026-07-28 12:00:00-03
98	09042-00000004	42	Panificados San Pedro S.R.L.	562750.10	paid	2026-07-30 13:00:00-03	2026-07-30 13:00:00-03	2026-07-30 13:00:00-03
99	09042-00000005	42	Electromecánica del Norte S.R.L.	570669.47	paid	2026-08-01 14:00:00-03	2026-08-01 14:00:00-03	2026-08-01 14:00:00-03
100	09042-00000006	42	Alimentos del Camino S.R.L.	578588.84	paid	2026-08-03 15:00:00-03	2026-08-03 15:00:00-03	2026-08-03 15:00:00-03
101	09042-00000007	42	Servicios Industriales del Litoral S.A.	586507.21	paid	2026-08-05 16:00:00-03	2026-08-05 16:00:00-03	2026-08-05 16:00:00-03
102	09042-00000008	42	Metalúrgica Belgrano S.R.L.	594426.58	paid	2026-08-07 09:00:00-03	2026-08-07 09:00:00-03	2026-08-07 09:00:00-03
103	09042-00000009	42	Bazar La Esquina S.R.L.	602345.95	paid	2026-08-09 10:00:00-03	2026-08-09 10:00:00-03	2026-08-09 10:00:00-03
104	09042-00000010	42	Tecnología del Litoral S.A.	610264.32	draft	\N	2026-08-11 11:00:00-03	2026-08-11 11:00:00-03
105	09042-00000011	42	Frutos de la Ribera S.R.L.	618183.69	cancelled	2026-08-13 12:00:00-03	2026-08-13 12:00:00-03	2026-08-13 12:00:00-03
106	09042-00000012	42	Construcciones del Acuerdo S.A.	626102.06	issued	2026-08-15 13:00:00-03	2026-08-15 13:00:00-03	2026-08-15 13:00:00-03
107	09042-00000013	42	Muebles del Centro S.R.L.	634021.43	issued	2026-08-17 14:00:00-03	2026-08-17 14:00:00-03	2026-08-17 14:00:00-03
108	09042-00000014	42	Vivero Las Acacias	641940.80	issued	2026-08-19 15:00:00-03	2026-08-19 15:00:00-03	2026-08-19 15:00:00-03
109	09042-00000015	42	Obras y Montajes del Río S.A.	649859.17	paid	2026-08-21 16:00:00-03	2026-08-21 16:00:00-03	2026-08-21 16:00:00-03
110	09042-00000016	42	Agroinsumos del Norte S.A.	657778.54	paid	2026-08-23 09:00:00-03	2026-08-23 09:00:00-03	2026-08-23 09:00:00-03
111	09042-00000017	42	Estudio Contable Mitre y Asociados	665697.91	paid	2026-08-25 10:00:00-03	2026-08-25 10:00:00-03	2026-08-25 10:00:00-03
112	09042-00000018	42	Textiles Costanera S.A.	673616.28	paid	2026-08-27 11:00:00-03	2026-08-27 11:00:00-03	2026-08-27 11:00:00-03
113	09042-00000019	42	Clínica Veterinaria Los Tilos	681535.65	paid	2026-08-29 12:00:00-03	2026-08-29 12:00:00-03	2026-08-29 12:00:00-03
114	09042-00000020	42	Distribuidora Arroyo Seco S.R.L.	689454.02	paid	2026-08-31 13:00:00-03	2026-08-31 13:00:00-03	2026-08-31 13:00:00-03
115	09042-00000021	42	Logística del Puerto S.A.	697373.39	paid	2026-09-02 14:00:00-03	2026-09-02 14:00:00-03	2026-09-02 14:00:00-03
116	09042-00000022	42	Cooperativa Gráfica del Paraná	705292.76	paid	2026-09-04 15:00:00-03	2026-09-04 15:00:00-03	2026-09-04 15:00:00-03
117	09042-00000023	42	Café Plaza Mayor S.R.L.	713211.13	draft	\N	2026-09-06 16:00:00-03	2026-09-06 16:00:00-03
118	09042-00000024	42	Ferretería del Paraná S.R.L.	721130.50	cancelled	2026-09-08 09:00:00-03	2026-09-08 09:00:00-03	2026-09-08 09:00:00-03
119	09042-00000025	42	La Ribera Provisiones S.R.L.	729049.87	issued	2026-09-10 10:00:00-03	2026-09-10 10:00:00-03	2026-09-10 10:00:00-03
120	09042-00000026	42	Insumos Médicos del Sur S.A.	736968.24	issued	2026-09-12 11:00:00-03	2026-09-12 11:00:00-03	2026-09-12 11:00:00-03
121	09043-00000001	43	Vivero Las Acacias	551340.10	paid	2026-07-25 10:00:00-03	2026-07-25 10:00:00-03	2026-07-25 10:00:00-03
122	09043-00000002	43	Obras y Montajes del Río S.A.	559259.47	paid	2026-07-27 11:00:00-03	2026-07-27 11:00:00-03	2026-07-27 11:00:00-03
123	09043-00000003	43	Agroinsumos del Norte S.A.	567178.84	paid	2026-07-29 12:00:00-03	2026-07-29 12:00:00-03	2026-07-29 12:00:00-03
124	09043-00000004	43	Estudio Contable Mitre y Asociados	575097.21	paid	2026-07-31 13:00:00-03	2026-07-31 13:00:00-03	2026-07-31 13:00:00-03
125	09043-00000005	43	Textiles Costanera S.A.	583016.58	paid	2026-08-02 14:00:00-03	2026-08-02 14:00:00-03	2026-08-02 14:00:00-03
126	09043-00000006	43	Clínica Veterinaria Los Tilos	590935.95	paid	2026-08-04 15:00:00-03	2026-08-04 15:00:00-03	2026-08-04 15:00:00-03
127	09043-00000007	43	Distribuidora Arroyo Seco S.R.L.	598854.32	paid	2026-08-06 16:00:00-03	2026-08-06 16:00:00-03	2026-08-06 16:00:00-03
128	09043-00000008	43	Logística del Puerto S.A.	606773.69	paid	2026-08-08 09:00:00-03	2026-08-08 09:00:00-03	2026-08-08 09:00:00-03
129	09043-00000009	43	Cooperativa Gráfica del Paraná	614692.06	draft	\N	2026-08-10 10:00:00-03	2026-08-10 10:00:00-03
130	09043-00000010	43	Café Plaza Mayor S.R.L.	622611.43	cancelled	2026-08-12 11:00:00-03	2026-08-12 11:00:00-03	2026-08-12 11:00:00-03
131	09043-00000011	43	Ferretería del Paraná S.R.L.	630530.80	issued	2026-08-14 12:00:00-03	2026-08-14 12:00:00-03	2026-08-14 12:00:00-03
132	09043-00000012	43	La Ribera Provisiones S.R.L.	638449.17	issued	2026-08-16 13:00:00-03	2026-08-16 13:00:00-03	2026-08-16 13:00:00-03
133	09043-00000013	43	Insumos Médicos del Sur S.A.	646368.54	issued	2026-08-18 14:00:00-03	2026-08-18 14:00:00-03	2026-08-18 14:00:00-03
134	09043-00000014	43	Repuestos del Oeste S.R.L.	654287.91	paid	2026-08-20 15:00:00-03	2026-08-20 15:00:00-03	2026-08-20 15:00:00-03
135	09043-00000015	43	Laboratorio La Estación S.R.L.	662206.28	paid	2026-08-22 16:00:00-03	2026-08-22 16:00:00-03	2026-08-22 16:00:00-03
136	09043-00000016	43	Pinturería Las Barrancas S.R.L.	670125.65	paid	2026-08-24 09:00:00-03	2026-08-24 09:00:00-03	2026-08-24 09:00:00-03
137	09043-00000017	43	Transporte Dos Ríos S.R.L.	678044.02	paid	2026-08-26 10:00:00-03	2026-08-26 10:00:00-03	2026-08-26 10:00:00-03
138	09046-00000001	46	Café Plaza Mayor S.R.L.	588381.43	paid	2026-07-28 10:00:00-03	2026-07-28 10:00:00-03	2026-07-28 10:00:00-03
139	09046-00000002	46	Ferretería del Paraná S.R.L.	596300.80	paid	2026-07-30 11:00:00-03	2026-07-30 11:00:00-03	2026-07-30 11:00:00-03
140	09046-00000003	46	La Ribera Provisiones S.R.L.	604219.17	paid	2026-08-01 12:00:00-03	2026-08-01 12:00:00-03	2026-08-01 12:00:00-03
141	09046-00000004	46	Insumos Médicos del Sur S.A.	612138.54	paid	2026-08-03 13:00:00-03	2026-08-03 13:00:00-03	2026-08-03 13:00:00-03
142	09046-00000005	46	Repuestos del Oeste S.R.L.	620057.91	paid	2026-08-05 14:00:00-03	2026-08-05 14:00:00-03	2026-08-05 14:00:00-03
143	09046-00000006	46	Laboratorio La Estación S.R.L.	627976.28	draft	\N	2026-08-07 15:00:00-03	2026-08-07 15:00:00-03
144	09046-00000007	46	Pinturería Las Barrancas S.R.L.	635895.65	cancelled	2026-08-09 16:00:00-03	2026-08-09 16:00:00-03	2026-08-09 16:00:00-03
145	09046-00000008	46	Transporte Dos Ríos S.R.L.	643814.02	issued	2026-08-11 09:00:00-03	2026-08-11 09:00:00-03	2026-08-11 09:00:00-03
146	09046-00000009	46	Hotel del Parque S.R.L.	651733.39	issued	2026-08-13 10:00:00-03	2026-08-13 10:00:00-03	2026-08-13 10:00:00-03
147	09047-00000001	47	Alimentos del Camino S.R.L.	600728.54	paid	2026-07-29 10:00:00-03	2026-07-29 10:00:00-03	2026-07-29 10:00:00-03
148	09047-00000002	47	Servicios Industriales del Litoral S.A.	608647.91	paid	2026-07-31 11:00:00-03	2026-07-31 11:00:00-03	2026-07-31 11:00:00-03
149	09047-00000003	47	Metalúrgica Belgrano S.R.L.	616566.28	paid	2026-08-02 12:00:00-03	2026-08-02 12:00:00-03	2026-08-02 12:00:00-03
150	09047-00000004	47	Bazar La Esquina S.R.L.	624485.65	paid	2026-08-04 13:00:00-03	2026-08-04 13:00:00-03	2026-08-04 13:00:00-03
151	09047-00000005	47	Tecnología del Litoral S.A.	632404.02	draft	\N	2026-08-06 14:00:00-03	2026-08-06 14:00:00-03
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: api-agente; Owner: -
--

COPY "api-agente".users (id, username, email, "passwordHash", role, "createdAt", "updatedAt", enabled) FROM stdin;
41	useradmin	useradmin@example.com	$2b$12$XMj5/eojGWXFwWXCuXOgDusfmVArpmR/GMt1HoBzAlEHR4TFf.02i	admin	2026-09-28 11:59:41.292-03	2026-09-28 11:59:41.292-03	t
42	postman_regular_01	postman.regular01@example.com	$2b$12$7qsPQzNZtY5YS0MkdSsy1ug1Qy7SZK9llj1Lv7negYzyIOZOPban2	regular	2026-09-28 13:11:03.503-03	2026-09-28 13:11:03.503-03	t
43	postman_regular_02	postman.regular02@example.com	$2b$12$bzJoD47SVWTb4AORxm71.ehj07UMnXe8GJ9HvlesaOs4YI4bc7GKS	regular	2026-09-28 13:14:44.791-03	2026-09-28 13:14:44.791-03	t
39	superadmin	admin-user@gmail.com	$2b$12$Ud.kLF3VV5jvj7s65Fpi4.7ooIRVz2AUDqqhWh8Ot.rAZTsXb9wIK	superadmin	2026-09-27 18:57:29.777-03	2026-09-27 18:57:29.777-03	t
45	postman_admin_01	postman.admin_01@example.com	$2b$12$7.jEJLG41IVcKM49tPpbcuBinb/lveoC1GDVmkT2flC9QZgqJX4XG	admin	2026-09-28 13:16:00.147-03	2026-09-28 13:16:00.147-03	t
47	postman_nuevoregular	postman.regular312@example.com	$2b$12$NxzwTL3x7Ez4c7yJ8d5G8ebBPAG44i0WtCNP4CGHx/Uiek8JP3yOu	regular	2026-09-28 13:43:29.146-03	2026-09-28 13:43:29.146-03	t
46	postman_regular_regular	postman.regular55@example.com	$2b$12$zx9NxXSBjxBeHnEgJNIR7.vEu8WUR0eW7uSx6rB7MnXTq2ClM0Lje	regular	2026-09-28 13:16:37.446-03	2026-09-28 13:16:37.446-03	f
40	newuser	newuser@example.com	$2b$12$fNBfoYwvRAZlCxw16rhahe9ehHc0bRCTFpgj1IKD2ut56qCQaJInG	regular	2026-09-27 21:57:41.638-03	2026-09-27 21:57:41.638-03	t
\.


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: api-agente; Owner: -
--

SELECT pg_catalog.setval('"api-agente".invoices_id_seq', 152, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: api-agente; Owner: -
--

SELECT pg_catalog.setval('"api-agente".users_id_seq', 49, true);


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

