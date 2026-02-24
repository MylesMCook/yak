import { expect, test as setup } from "@playwright/test";

const authFile = "tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  setup.skip(
    !email || !password,
    "TEST_EMAIL and TEST_PASSWORD must be set for e2e. Create a test user in the DB and set env (see tests/README.md)."
  );

  const emailStr = email as string;
  const passwordStr = password as string;

  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(emailStr);
  await page.getByLabel("Password").fill(passwordStr);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\//, { timeout: 15_000 });

  await page.context().storageState({ path: authFile });
});
