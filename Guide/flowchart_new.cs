        +----------------------+          +------------------------------+           +----------------------------------+
        |       Frontend       |          |          UI Actions          |           |            Data Stores           |
        +----------------------+          +------------------------------+           +----------------------------------+
        |  Login               |  ----->  |  Sign In / Sign Up           |  ----->   |  Users (JSON)                    |
        |                      |          |                              |   ---->   |  Password Resets (JSON)          |
        |  Dashboard           |  ----->  |  Overview of Features        |           |                                  |
        |                      |  ----->  |  Profile                     |           |  Company Data (Elasticsearch)    |
        |  Search FUID         |  ----->  |  Detailed Description        |           |                                  |
        |                      |          |  Platform                    |           |  Embeddings DB                   |
        |  Generate FUID       |  ----->  |  Enter Company/Product       |           |  RAG Embeddings DB               |
        |                      |          |  Status: Existing -> ID found|           +----------------------------------+
        |  Application Tracker |  ----->  |  Status: New -> Submitted    |
        |    (new FUID)        |          |  Company/Product Name        |
        |                      |          |  Categories                  |
        |  Logout              |          +------------------------------+
        +----------------------+
                                         |
                                         v
                              +-----------------------------+
                              |           Backend            |
                              +-----------------------------+
                              |  User Creation               |-----> Updates -> Users (JSON)
                              |                              |-----> Updates -> Password Resets (JSON)
                              |  Normalize Data              |-----> Reads/Writes -> Company Data
                              |    & Extract Versions        |
                              |  Generate FUID               |-----> Writes -> Company Data
                              |  Matching & Search           |-----> Uses -> Embeddings DB
                              |  RAG                          |-----> Uses -> RAG Embeddings DB
                              +-----------------------------+
                                         ^
                                         |
                      (Requests from UI Actions via API: /auth, /data, /stats, /search, /extract-version, /generate-fuid, /rag/*)

        Flow summary:
        - Frontend pages trigger UI Actions.
        - UI Actions call Backend APIs.
        - Backend persists and queries Data Stores (Users/Resets JSON, Company Data, Embeddings, RAG Embeddings).
        - Results flow back to Frontend components (Dashboard, Search, Generate, Application Tracker). 