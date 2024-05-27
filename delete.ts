import { auth } from './src/database/admin';

async function main() {
  const { users } = await auth.listUsers();

  console.log({ users: users.length });

  const promises = users.map(async (user) => {
    await auth.deleteUser(user.uid);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  await Promise.all(promises);

  return 'done';
}

main().then(console.log);
