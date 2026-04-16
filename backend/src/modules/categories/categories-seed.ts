import type { PrismaClient, CategoryType } from '@prisma/client';

interface SeedCategory {
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  children?: SeedCategory[];
}

// Novos usuários recebem só as duas raízes.
// Cada cliente cria suas próprias subcategorias do jeito dele.
const DEFAULT_CATEGORIES: SeedCategory[] = [
  {
    name: 'Despesa',
    type: 'EXPENSE',
    color: '#ef4444',
    icon: 'trending-down',
  },
  {
    name: 'Receita',
    type: 'INCOME',
    color: '#22c55e',
    icon: 'trending-up',
  },
];

/**
 * Cria as categorias padrão para uma empresa (até 3 níveis).
 * IDEMPOTENTE: pula categorias que já existem (por nome + parentId + companyId).
 * Seguro pra chamar tanto no signup quanto pra clientes existentes.
 */
export async function seedDefaultCategories(
  prisma: PrismaClient,
  companyId: string,
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  async function seedLevel(
    cats: SeedCategory[],
    parentId: string | null,
  ): Promise<void> {
    for (const cat of cats) {
      const existing = await prisma.category.findFirst({
        where: {
          companyId,
          name: cat.name,
          parentCategoryId: parentId,
        },
      });

      let catId: string;

      if (existing) {
        catId = existing.id;
        skipped++;
      } else {
        const record = await prisma.category.create({
          data: {
            companyId,
            name: cat.name,
            type: cat.type,
            color: cat.color,
            icon: cat.icon,
            parentCategoryId: parentId,
          },
        });
        catId = record.id;
        created++;
      }

      if (cat.children && cat.children.length > 0) {
        await seedLevel(cat.children, catId);
      }
    }
  }

  await seedLevel(DEFAULT_CATEGORIES, null);
  return { created, skipped };
}
