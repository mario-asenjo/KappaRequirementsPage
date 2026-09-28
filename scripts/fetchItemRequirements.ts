import { rename, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { fetchFandomItemRequirements } from './fandomItemRequirements';
import { buildItemRequirementIndex, validateItemRequirementIndex } from './data-normalizers/itemRequirements';
import { fetchTarkovDevItemRequirementsDataset } from './data-sources/tarkovDevItemRequirements';

async function fetchItemRequirements() {
  const dataset = await fetchTarkovDevItemRequirementsDataset();
  let fandomItems = [];
  let fandomError: string | undefined;
  try {
    fandomItems = await fetchFandomItemRequirements();
  } catch (error) {
    fandomError = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Fandom enrichment failed; continuing with structured JSON data. ${fandomError}`);
  }

  const index = buildItemRequirementIndex(dataset, fandomItems, fandomError);
  validateItemRequirementIndex(index);
  const filePath = fileURLToPath(new URL('../src/data/itemRequirements.json', import.meta.url));
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
  console.log(
    `Built ${index.metadata.itemCount} item entries with ${index.metadata.requirementCount} requirements and ${index.metadata.barterCount} trader barters `
    + `(${index.metadata.barterTraderCount} traders; ${index.metadata.bartersWithLoyaltyLevel} with loyalty level)`,
  );
}

fetchItemRequirements().catch((error) => {
  console.error(error);
  process.exit(1);
});
