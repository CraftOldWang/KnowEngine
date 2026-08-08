export const documentAccept = ".pdf,.doc,.docx,.xls,.xlsx,.md,.txt,.csv";
export function validateDocumentFile(file: File) {
  if (file.size === 0) throw new Error("文件为空，请选择有内容的文档。");
  if (file.size > 100 * 1024 * 1024)
    throw new Error("文件超过 100MB，请压缩或拆分后上传。");
  if (!/\.(pdf|docx?|xlsx?|md|txt|csv)$/i.test(file.name))
    throw new Error("请选择 PDF、Word、Excel、Markdown、TXT 或 CSV 文件。");
}
