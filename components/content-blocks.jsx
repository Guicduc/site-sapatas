import Link from "next/link";

import styles from "./content-blocks.module.css";

// Blocos de texto editorial usados pelos guias (/guias) e pelo guia de cada familia.
// Um "texto rico" e uma string ou um array de trechos (string ou link interno { href, label }).

export function RichText({ value }) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((part, index) =>
    typeof part === "string" ? (
      part
    ) : (
      <Link key={`${part.href}-${index}`} href={part.href}>
        {part.label}
      </Link>
    )
  );
}

export function ContentTable({ table }) {
  return (
    <figure className={styles.tableFigure}>
      <div className="table-wrap">
        <table className={styles.table}>
          <caption>{table.caption}</caption>
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.join("|")}>
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={`${index}-${cell}`} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={`${index}-${cell}`}>{cell}</td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note ? <figcaption className={styles.note}>{table.note}</figcaption> : null}
    </figure>
  );
}

export function ContentSection({ section, idPrefix = "", headingLevel = "h2" }) {
  const Heading = headingLevel;
  const headingId = `${idPrefix}${section.id}`;
  const ListTag = section.ordered ? "ol" : "ul";

  return (
    <section className="page-panel legal-section" aria-labelledby={headingId}>
      <div>
        <Heading id={headingId}>{section.title}</Heading>
      </div>
      <div className="legal-copy">
        {section.list ? (
          <ListTag>
            {section.list.map((item, index) => (
              <li key={index}>
                <RichText value={item} />
              </li>
            ))}
          </ListTag>
        ) : null}
        {section.table ? <ContentTable table={section.table} /> : null}
        {(section.paragraphs || []).map((paragraph, index) => (
          <p key={index}>
            <RichText value={paragraph} />
          </p>
        ))}
      </div>
    </section>
  );
}
