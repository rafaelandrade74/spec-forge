import { TokenService } from "@spec-forge/core";

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case "create": {
      const label = args.join(" ").trim() || "default";
      const result = await TokenService.generateToken(label);
      console.log(`Token created (label: "${result.label}"). Save it now — it will not be shown again:\n`);
      console.log(result.token);
      console.log(`\nid: ${result.id}`);
      break;
    }
    case "list": {
      const tokens = await TokenService.listTokens();
      if (tokens.length === 0) {
        console.log("No tokens yet. Run: pnpm token:create \"label\"");
        break;
      }
      for (const t of tokens) {
        const status = t.revokedAt ? `revoked ${t.revokedAt.toISOString()}` : "active";
        const lastUsed = t.lastUsedAt ? t.lastUsedAt.toISOString() : "never";
        console.log(`${t.id}  [${status}]  "${t.label}"  created ${t.createdAt.toISOString()}  last used ${lastUsed}`);
      }
      break;
    }
    case "revoke": {
      const id = args[0];
      if (!id) {
        console.error("Usage: pnpm token:revoke <token-id>");
        process.exit(1);
      }
      await TokenService.revokeToken(id);
      console.log(`Token ${id} revoked.`);
      break;
    }
    default:
      console.error('Usage: tsx src/cli-token.ts <create "label"|list|revoke <id>>');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
