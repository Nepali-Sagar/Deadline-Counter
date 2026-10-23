
import { describe, it, expect } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "./app.js";

const validDeadline = () => ({
  title: `Test deadline ${Date.now()}-${Math.random()}`,
  dueDate: "2027-06-15T10:00:00.000Z",
  isUrgent: false,
  category: "Study",
  isCompleted: false,
});

async function createTestDeadline() {
  const response = await request(app)
    .post("/api/deadlines")
    .send(validDeadline());

  expect(response.status).toBe(201);

  return response.body.data._id as string;
}

async function deleteTestDeadline(id: string) {
  await request(app).delete(`/api/deadlines/${id}`);
}

describe("Deadline API", () => {
  // 1. HEALTH CHECK
  it("GET /api/health returns success", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Deadline API is running");
  });

  // 2. UNKNOWN ROUTE
  it("unknown routes return 404", async () => {
    const response = await request(app).get("/api/unknown");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  // 3. LIST DEADLINES
  it("GET /api/deadlines returns a list", async () => {
    const response = await request(app).get("/api/deadlines");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.count).toBe(response.body.data.length);
  });

  // 4. EMPTY CREATE REQUEST
  it("rejects an empty create request", async () => {
    const response = await request(app)
      .post("/api/deadlines")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  // 5. EMPTY TITLE
  it("rejects a whitespace-only title", async () => {
    const response = await request(app)
      .post("/api/deadlines")
      .send({
        ...validDeadline(),
        title: "   ",
      });

    expect(response.status).toBe(400);
  });

  // 6. INVALID DATE
  it("rejects an invalid due date", async () => {
    const response = await request(app)
      .post("/api/deadlines")
      .send({
        ...validDeadline(),
        dueDate: "not-a-date",
      });

    expect(response.status).toBe(400);
  });

  // 7. MISSING DATE
  it("rejects a missing due date", async () => {
    const { dueDate, ...data } = validDeadline();

    const response = await request(app)
      .post("/api/deadlines")
      .send(data);

    expect(response.status).toBe(400);
  });

  // 8. INVALID CATEGORY
  it("rejects an invalid category", async () => {
    const response = await request(app)
      .post("/api/deadlines")
      .send({
        ...validDeadline(),
        category: "Gaming",
      });

    expect(response.status).toBe(400);
  });

  // 9. INVALID BOOLEAN
  it("rejects a non-boolean isUrgent value", async () => {
    const response = await request(app)
      .post("/api/deadlines")
      .send({
        ...validDeadline(),
        isUrgent: "yes",
      });

    expect(response.status).toBe(400);
  });

  // 10. INVALID COMPLETED VALUE
  it("rejects a non-boolean isCompleted value", async () => {
    const response = await request(app)
      .post("/api/deadlines")
      .send({
        ...validDeadline(),
        isCompleted: "no",
      });

    expect(response.status).toBe(400);
  });

  // 11. INVALID ID
  it("rejects an invalid deadline ID", async () => {
    const response = await request(app)
      .get("/api/deadlines/invalid-id");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  // 12. GET NONEXISTENT DEADLINE
  it("returns 404 for a nonexistent deadline", async () => {
    const id = new mongoose.Types.ObjectId().toString();

    const response = await request(app).get(`/api/deadlines/${id}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  // 13. UPDATE NONEXISTENT DEADLINE
  it("returns 404 when updating a nonexistent deadline", async () => {
    const id = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .put(`/api/deadlines/${id}`)
      .send({ title: "Updated title" });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  // 14. DELETE NONEXISTENT DEADLINE
  it("returns 404 when deleting a nonexistent deadline", async () => {
    const id = new mongoose.Types.ObjectId().toString();

    const response = await request(app).delete(`/api/deadlines/${id}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  // 15. INVALID UPDATE TITLE
  it("rejects an empty title during update", async () => {
    const id = await createTestDeadline();

    try {
      const response = await request(app)
        .put(`/api/deadlines/${id}`)
        .send({ title: "   " });

      expect(response.status).toBe(400);
    } finally {
      await deleteTestDeadline(id);
    }
  });

  // 16. INVALID UPDATE DATE
  it("rejects an invalid date during update", async () => {
    const id = await createTestDeadline();

    try {
      const response = await request(app)
        .put(`/api/deadlines/${id}`)
        .send({ dueDate: "invalid-date" });

      expect(response.status).toBe(400);
    } finally {
      await deleteTestDeadline(id);
    }
  });

  // 17. INVALID UPDATE CATEGORY
  it("rejects an invalid category during update", async () => {
    const id = await createTestDeadline();

    try {
      const response = await request(app)
        .put(`/api/deadlines/${id}`)
        .send({ category: "Gaming" });

      expect(response.status).toBe(400);
    } finally {
      await deleteTestDeadline(id);
    }
  });

  // 18. INVALID UPDATE BOOLEAN
  it("rejects a non-boolean isUrgent during update", async () => {
    const id = await createTestDeadline();

    try {
      const response = await request(app)
        .put(`/api/deadlines/${id}`)
        .send({ isUrgent: "yes" });

      expect(response.status).toBe(400);
    } finally {
      await deleteTestDeadline(id);
    }
  });

  // 19. PARTIAL UPDATE
  it("updates one field without changing other fields", async () => {
    const id = await createTestDeadline();

    try {
      const before = await request(app).get(`/api/deadlines/${id}`);

      const response = await request(app)
        .put(`/api/deadlines/${id}`)
        .send({ title: "Updated test title" });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe("Updated test title");
      expect(response.body.data.category).toBe(
        before.body.data.category,
      );
      expect(response.body.data.isUrgent).toBe(
        before.body.data.isUrgent,
      );
    } finally {
      await deleteTestDeadline(id);
    }
  });

  // 20. FULL CRUD
  it("creates, reads, updates, lists, and deletes a deadline", async () => {
    let id: string | undefined;

    try {
      // CREATE
      const createResponse = await request(app)
        .post("/api/deadlines")
        .send(validDeadline());

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      id = createResponse.body.data._id;
      expect(id).toBeTruthy();

      // READ ONE
      const readResponse = await request(app)
        .get(`/api/deadlines/${id}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data._id).toBe(id);

      // UPDATE
      const updateResponse = await request(app)
        .put(`/api/deadlines/${id}`)
        .send({ title: "CRUD updated" });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.title).toBe("CRUD updated");

      // READ ALL
      const listResponse = await request(app).get("/api/deadlines");

      expect(listResponse.status).toBe(200);
      expect(
        listResponse.body.data.some(
          (item: { _id: string }) => item._id === id,
        ),
      ).toBe(true);

      // DELETE
      const deleteResponse = await request(app)
        .delete(`/api/deadlines/${id}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // VERIFY DELETION
      id = undefined;

      const deletedResponse = await request(app).get(
        `/api/deadlines/${createResponse.body.data._id}`,
      );

      expect(deletedResponse.status).toBe(404);
    } finally {
      if (id) {
        await deleteTestDeadline(id);
      }
    }
  });


it("should reject malformed JSON", async () => {
  const response = await request(app)
    .post("/api/deadlines")
    .set("Content-Type", "application/json")
    .send('{"title":');

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "Invalid JSON request body"
  );
});

it("should reject an oversized request body", async () => {
  const response = await request(app)
    .post("/api/deadlines")
    .set("Content-Type", "application/json")
    .send({
      title: "A".repeat(110 * 1024),
      dueDate: "2027-06-15T10:00:00.000Z",
    });

  expect(response.status).toBe(413);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "Request body is too large"
  );
});

});
