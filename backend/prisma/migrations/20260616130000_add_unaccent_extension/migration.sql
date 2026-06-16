-- Habilita busca sem acento (diacritic-insensitive) na lista de transações.
-- Usada na busca por descrição/notas: unaccent(description) ILIKE unaccent(termo)
CREATE EXTENSION IF NOT EXISTS unaccent;
