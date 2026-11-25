# 🌌 Star Wars Nexus

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![SWAPI](https://img.shields.io/badge/SWAPI-FFD700?style=for-the-badge&logoColor=black)

> Uma galáxia muito, muito distante. Explore o universo de Star Wars em uma experiência interativa, imersiva e responsiva.

## 📖 Sobre o projeto

O **Star Wars Nexus** é uma aplicação web multipágina desenvolvida para explorar personagens, planetas, naves e filmes do universo Star Wars.

O projeto utiliza a **SWAPI (Star Wars API)** para consumir informações dinamicamente, combinando dados da API com recursos visuais locais e uma interface inspirada na identidade cinematográfica da franquia.

Desenvolvido como projeto acadêmico da disciplina de Construção de Interfaces Web do Instituto Federal de São Paulo (IFSP).

---

## 🚀 Explore a galáxia

| Categoria | Quantidade prevista | Descrição |
|---|---:|---|
| 👤 Personagens | 82 | Heróis, vilões, Jedi, Sith e droides |
| 🪐 Planetas | 60 | Mundos e ambientes da galáxia |
| 🚀 Naves | 36 | Caças, cargueiros e estações espaciais |
| 🎬 Filmes | 11 | Saga Skywalker e histórias derivadas |
| **Total** | **189** | **Registros do catálogo** |

## ✨ Funcionalidades

- Página inicial com identidade visual cinematográfica.
- Páginas independentes para cada categoria.
- Consumo dinâmico de dados da SWAPI.
- Paginação automática das requisições.
- Geração dinâmica de cards.
- Pesquisa por nome ou título.
- Modais de detalhes utilizando Bootstrap.
- Armazenamento de dados em cache com LocalStorage.
- Imagens locais de personagens, planetas, naves e filmes.
- Sistema de favoritos para naves.
- Animações e transições com CSS e JavaScript.
- Estados de carregamento e tratamento de erros.
- Interface responsiva para computadores, tablets e celulares.
- Identidade visual personalizada e favicon próprio.

---

## 🎬 Catálogo cinematográfico

O catálogo contempla os nove episódios da Saga Skywalker e dois filmes derivados.

### Saga Skywalker

| Episódio | Filme | Ano |
|---|---|---:|
| I | A Ameaça Fantasma | 1999 |
| II | Ataque dos Clones | 2002 |
| III | A Vingança dos Sith | 2005 |
| IV | Uma Nova Esperança | 1977 |
| V | O Império Contra-Ataca | 1980 |
| VI | O Retorno de Jedi | 1983 |
| VII | O Despertar da Força | 2015 |
| VIII | Os Últimos Jedi | 2017 |
| IX | A Ascensão Skywalker | 2019 |

### Histórias Star Wars

| Filme | Ano |
|---|---:|
| Rogue One: Uma História Star Wars | 2016 |
| Han Solo: Uma História Star Wars | 2018 |

A SWAPI disponibiliza os seis primeiros episódios da saga. Os demais filmes do catálogo são complementados por dados locais, mantendo a API como principal fonte de informações.

---

## 🛠️ Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| HTML5 | Estrutura semântica das páginas |
| CSS3 | Estilização, responsividade e animações |
| JavaScript | Interatividade e manipulação do DOM |
| Bootstrap 5 | Componentes responsivos e modais |
| Fetch API | Requisições HTTP assíncronas |
| LocalStorage | Cache e persistência local |
| JSON | Estruturação dos dados |
| SWAPI | Fonte principal de informações |
| Git e GitHub | Versionamento e colaboração |

## 🎨 Identidade visual

A interface foi desenvolvida com inspiração na atmosfera cinematográfica de Star Wars, utilizando elementos espaciais, tipografia futurista e efeitos visuais.

| Cor | Aplicação |
|---|---|
| 🟡 Amarelo-dourado | Destaques, botões e elementos interativos |
| 🔵 Azul-marinho | Estrutura visual e elementos secundários |
| ⚫ Preto | Fundos e ambientação espacial |
| ⚪ Branco | Textos e contraste |

As animações e os efeitos visuais utilizam CSS e JavaScript, preservando a navegação e a usabilidade.

---

## 🌐 API utilizada

O projeto utiliza a **Star Wars API (SWAPI)**.

- Site oficial: https://swapi.dev/
- Documentação: https://swapi.dev/documentation

### Endpoints

| Recurso | Endpoint |
|---|---|
| Personagens | `/api/people/` |
| Planetas | `/api/planets/` |
| Naves | `/api/starships/` |
| Filmes | `/api/films/` |

As requisições são realizadas de forma assíncrona, permitindo carregar os registros disponíveis e apresentá-los dinamicamente na interface.

### Cache local

O LocalStorage é utilizado para armazenar os dados obtidos da API, reduzindo requisições repetidas e melhorando o desempenho da aplicação.

---

## 💻 Como executar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/ryanluccadev/Star-Wars-Nexus.git
```

### 2. Acesse a pasta do projeto

```bash
cd Star-Wars-Nexus
```

### 3. Abra no Visual Studio Code

```bash
code .
```

### 4. Execute a aplicação

Instale a extensão **Live Server** no Visual Studio Code.

Clique com o botão direito no arquivo `index.html` e selecione **Open with Live Server**.

O projeto não necessita de instalação de dependências, banco de dados ou servidor backend próprio.

---

## 📱 Responsividade

A interface foi projetada para diferentes tamanhos de tela:

- Computadores e notebooks.
- Tablets.
- Smartphones.

A utilização do Bootstrap, combinada com CSS personalizado, permite adaptar os componentes e a navegação aos diferentes dispositivos.

## 📚 Conceitos aplicados

- Desenvolvimento web front-end.
- Consumo de APIs REST.
- Programação assíncrona.
- Manipulação dinâmica do DOM.
- HTML semântico.
- Design responsivo.
- Persistência de dados no navegador.
- Modularização de código.
- Acessibilidade web.
- Controle de versão e desenvolvimento colaborativo.

---

## 👨‍💻 Desenvolvedores

| Integrante | GitHub |
|---|---|
| Ryan Lucca Marques Pereira | [@ryanluccadev](https://github.com/ryanluccadev) |
| Pedro Aragoni | Desenvolvedor |

## 🎓 Informações acadêmicas

| Informação | Descrição |
|---|---|
| Instituição | Instituto Federal de São Paulo — IFSP |
| Campus | Araraquara |
| Curso | Tecnologia em Sistemas para Internet |
| Disciplina | Construção de Interfaces Web — ARQCIWB |
| Semestre | 2º semestre |
| Ano | 2026 |
| Projeto | Star Wars Nexus |

---

## 🔗 Referências

- [Star Wars — Site oficial](https://www.starwars.com/)
- [Star Wars API](https://swapi.dev/)
- [Bootstrap](https://getbootstrap.com/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Wookieepedia](https://starwars.fandom.com/)

## ⚖️ Direitos autorais

Star Wars, seus personagens, nomes, marcas e elementos visuais pertencem aos seus respectivos detentores de direitos.

O Star Wars Nexus é um projeto acadêmico, independente e sem fins comerciais, sem vínculo oficial com a Lucasfilm ou a Disney.

---

**Star Wars Nexus — Explore além das estrelas.**

*Que a Força esteja com você.*
