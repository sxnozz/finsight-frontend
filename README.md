# FinSight — Frontend

![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-8-purple)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

Interface web do FinSight, uma aplicação de gestão financeira pessoal com análises geradas por inteligência artificial.

**Demo ao vivo:** https://finsight-frontend-lemon.vercel.app

<img width="1314" height="604" alt="{ACD9134E-4E52-44E3-A9CD-A71E1B8CC950}" src="https://github.com/user-attachments/assets/d2296da1-0d23-4693-baec-fea09bed0729" />

<img width="1321" height="506" alt="{1B6A48CD-395E-497E-91B8-86CAA70C6BCC}" src="https://github.com/user-attachments/assets/8f7801df-faf0-495f-8909-19dbce49703e" />

<img width="1325" height="594" alt="{CEEFB0FB-1623-474B-9FFE-FF47C470591D}" src="https://github.com/user-attachments/assets/12d6d53a-ebe2-426e-9c37-951996004250" />

<img width="1319" height="624" alt="{1E1586DE-F0AE-4338-8D65-9C77653DAC86}" src="https://github.com/user-attachments/assets/5fa7afa7-9d86-444b-a0ee-ae38dbc54151" />



## Índice

- [Sobre o projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Rodando localmente](#rodando-localmente)
- [Deploy](#deploy)

## Sobre o projeto

Interface para importar extratos bancários, visualizar transações categorizadas em gráficos, e gerar relatórios financeiros em linguagem natural a partir dos próprios dados do usuário. Consome a [API do FinSight](https://github.com/sxnozz/finsight-backend), desenvolvida em Java e Spring Boot.

## Funcionalidades

- Cadastro e login com verificação de e-mail
- Upload de extratos (CSV/OFX) com feedback de progresso
- Dashboard com gráficos de receitas, despesas e categorias (Recharts)
- Edição e exclusão de transações
- Geração de insights financeiros via IA, com histórico de análises
- Tema claro/escuro
- Modo de demonstração, com conta pública somente leitura

## Tecnologias

- **React 19** + **Vite**
- **Tailwind CSS**
- **Recharts**

## Rodando localmente

Pré-requisitos: Node.js, e o [backend](https://github.com/sxnozz/finsight-backend) rodando (local ou hospedado).

```bash
git clone https://github.com/sxnozz/finsight-frontend.git
cd finsight-frontend
npm install
npm run dev
```

Por padrão, a aplicação aponta para `http://localhost:8080`. Para usar um backend hospedado, defina a variável de ambiente `VITE_API_URL` com a URL da API antes do build, ou num arquivo `.env.local` na raiz do projeto:

```
VITE_API_URL=https://sua-api-hospedada.com
```

## Deploy

Hospedado gratuitamente na [Vercel](https://vercel.com), com deploy automático a cada push na branch principal.

## Licença

Distribuído sob a licença MIT.

## Autor

[Autor](https://github.com/sxnozz) — [Linkedin](https://www.linkedin.com/in/gustavo-bizarro-soares)
