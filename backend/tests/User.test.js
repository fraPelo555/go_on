jest.mock("google-auth-library", () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: jest.fn(),
    })),
  };
}); 

const path = require("path");

const uploadDir = path.join(__dirname, "uploads");
process.env.UPLOAD_BASE_DIR = uploadDir;

const request = require("supertest");
const app = require("../src/app.js");
const db = require("./setup.js");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const fs = require("fs");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");

const { User } = require("../src/models/User");
const { Trail } = require("../src/models/Trail");
const { Feedback } = require("../src/models/Feedback.js");
const { Report } = require("../src/models/Report.js");

dotenv.config();

process.env.GOOGLE_CLIENT_ID = "test-google-client-id";

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  /* Per rimuovere automaticamente i file nel tests/uploads
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }
  */
  await db.closeDatabase();
});

const normalize = (users) =>
  users.map(
    ({ _id, id, token, createdAt, updatedAt, __v, ...rest }) => rest,
  );

const createUser = async ({
  email = "user@user.com",
  password = "password",
  username = "test",
  role = "user",
} = {}) => {
  const hashed = await bcrypt.hash(password, 10);
  return User.create({
    email,
    username,
    password: hashed,
    role,
  });
};

describe("POST /users - autenticazione locale", () => {
  it("200 - autentica un utente esistente con password corretta", async () => {
    const password = "password123";
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: "test@example.com",
      username: "testuser",
      password: hashed,
    });

    const res = await request(app)
      .post("/users")
      .send({
        email: "test@example.com",
        password,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe(user.email);
    expect(res.body.username).toBe(user.username);

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.email).toBe(user.email);

    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("201 - crea un nuovo utente se non esiste", async () => {
    const res = await request(app)
      .post("/users")
      .send({
        email: "nuovo@example.com",
        password: "password123",
        username: "nuovoutente",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe("nuovo@example.com");
    expect(res.body.username).toBe("nuovoutente");

    const userInDb = await User.findOne({ email: "nuovo@example.com" });
    expect(userInDb).not.toBeNull();
    expect(userInDb.username).toBe("nuovoutente");

    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("401 - rifiuta autenticazione con password errata", async () => {
    const hashed = await bcrypt.hash("password123", 10);

    await User.create({
      email: "test@example.com",
      username: "testuser",
      password: hashed,
    });

    const res = await request(app)
      .post("/users")
      .send({
        email: "test@example.com",
        password: "password-sbagliata",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("400 - rifiuta richiesta senza email e password", async () => {
    const res = await request(app)
      .post("/users")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /users - autenticazione Google", () => {
  it("201 - crea un nuovo utente al primo login Google", async () => {
    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          email: "googleuser@example.com",
          name: "Google User",
        }),
      }),
    }));

    const res = await request(app)
      .post("/users")
      .send({
        googleToken: "token-valido",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe("googleuser@example.com");
    expect(res.body.username).toBe("Google User");

    const userInDb = await User.findOne({ email: "googleuser@example.com" });
    expect(userInDb).not.toBeNull();

    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("200 - autentica un utente Google già esistente", async () => {
    await User.create({
      email: "googleuser@example.com",
      username: "Google User",
      password: "placeholder",
    });

    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          email: "googleuser@example.com",
          name: "Google User",
        }),
      }),
    }));

    const res = await request(app)
      .post("/users")
      .send({
        googleToken: "token-valido",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe("googleuser@example.com");
    expect(res.body.username).toBe("Google User");
  });

  it("500 - fallisce autenticazione con Google token non valido", async () => {
    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: jest.fn().mockRejectedValue(new Error("Invalid token")),
    }));

    const res = await request(app)
      .post("/users")
      .send({
        googleToken: "token-non-valido",
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
