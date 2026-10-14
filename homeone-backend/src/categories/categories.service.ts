import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import { assertNoError } from '../database/supabase-error.util';
import type { MainCategoryResponseDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(@Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient) {}

  /**
   * The seven fixed customer categories with their live service domains.
   * Empty categories are returned as-is so the app can show honest
   * coming-soon states instead of invented coverage.
   */
  async findAll(): Promise<MainCategoryResponseDto[]> {
    const { data: categories, error: categoryError } = await this.client
      .from('main_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    assertNoError(categoryError);

    const { data: links, error: linkError } = await this.client
      .from('domain_categories')
      .select('category_id, domain_id');
    assertNoError(linkError);

    const domainIds = [
      ...new Set(((links ?? []) as { domain_id: string }[]).map((l) => l.domain_id)),
    ];
    const { data: domains } = domainIds.length
      ? await this.client
          .from('service_domains')
          .select('id, domain_name')
          .in('id', domainIds)
          .eq('is_active', true)
      : { data: [] as { id: string; domain_name: string }[] };

    const domainById = new Map(
      ((domains ?? []) as { id: string; domain_name: string }[]).map((d) => [d.id, d.domain_name]),
    );
    const domainIdsByCategory = new Map<string, string[]>();
    for (const link of (links ?? []) as { category_id: string; domain_id: string }[]) {
      if (!domainById.has(link.domain_id)) continue;
      const list = domainIdsByCategory.get(link.category_id) ?? [];
      list.push(link.domain_id);
      domainIdsByCategory.set(link.category_id, list);
    }

    return (
      (categories ?? []) as {
        id: string;
        category_name: string;
        icon: string;
        sort_order: number;
      }[]
    ).map((category) => ({
      id: category.id,
      categoryName: category.category_name,
      icon: category.icon,
      sortOrder: category.sort_order,
      domains: (domainIdsByCategory.get(category.id) ?? [])
        .map((domainId) => ({ id: domainId, domainName: domainById.get(domainId) as string }))
        .sort((a, b) => a.domainName.localeCompare(b.domainName)),
    }));
  }
}
