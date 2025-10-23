declare module "flexsearch" {
  export type Id = string | number;

  export interface DocumentIndexDescriptor {
    field: string;
    tokenize?: string;
    optimize?: boolean;
    context?: {
      depth?: number;
      resolution?: number;
    };
  }

  export interface DocumentConfig {
    preset?: string;
    tokenize?: string;
    document?: {
      id: string;
      index: DocumentIndexDescriptor[];
    };
  }

  export type BoolOperator = "and" | "or";

  export interface DocumentSearchOptions<Enrich extends boolean> {
    limit?: number;
    suggest?: boolean;
    enrich?: Enrich;
    bool?: BoolOperator;
  }

  export interface SimpleDocumentSearchResultSetUnit {
    field: string;
    result: Id[];
  }

  export type StoreOption = boolean | string | string[];

  export class Document<T, _Store extends StoreOption = false> {
    constructor(config: DocumentConfig);
    add(document: T): this;
    search<Enrich extends boolean = false>(
      query: string,
      options: Partial<DocumentSearchOptions<Enrich>>,
    ): SimpleDocumentSearchResultSetUnit[];
  }
}

declare module "flexsearch/dist/module/document.js" {
  import { Document } from "flexsearch";

  const DocumentConstructor: typeof Document;
  export default DocumentConstructor;
}
