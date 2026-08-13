async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.log("Skip admin bootstrap (ADMIN_BOOTSTRAP_EMAIL unset).");
    return;
  }
  console.log(
    `Clerk admin: sign in as ${email}, or set publicMetadata.role = "admin" on that Clerk user.`,
  );
}

main().catch((error) => {
  console.error("Admin bootstrap failed:", error);
  process.exit(1);
});
