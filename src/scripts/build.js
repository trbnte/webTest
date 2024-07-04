// Contentful SDKをインポート。これにより、ContentfulのAPIを簡単に使用できる
const contentful = require('contentful');

// Node.jsのファイルシステムモジュールをインポート。Promiseベースの非同期操作が可能
const fs = require('fs').promises;

// ファイルパスを扱うためのNode.jsの組み込みモジュールをインポート
const path = require('path');

// Contentfulクライアントを作成。環境変数からスペースIDとアクセストークンを取得
const client = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
});

// Contentfulから記事エントリーを取得する非同期関数
async function getEntries() {
  // '記事'コンテンツタイプのエントリーを日時の降順で取得
  const entries = await client.getEntries({
    content_type: '記事',
    order: '-fields.日時'
  });
  return entries.items;
}

// サイト全体をビルドする非同期関数
async function buildSite() {
  const entries = await getEntries();
  await updateHomepage(entries.slice(0, 3));
  await updateNewsList(entries);
  await generateArticlePages(entries);
}

// ホームページを更新する非同期関数
async function updateHomepage(latestEntries) {
  let homeHtml = await fs.readFile('src/templates/home.html', 'utf-8');

  const newsSection = latestEntries.map(entry => `
    <a href="/news/${entry.fields.日時}.html">
      <h2>${entry.fields.タイトル}</h2>
      <p>${entry.fields.日時}</p>
    </a>
  `).join('');

  homeHtml = homeHtml.replace('<!-- NEWS_PLACEHOLDER -->', newsSection);
  await fs.writeFile('public/index.html', homeHtml);
}

// お知らせ一覧ページを更新する非同期関数
async function updateNewsList(entries) {
  let newsListHtml = await fs.readFile('src/templates/news-list.html', 'utf-8');

  const newsItems = entries.map(entry => `
    <a href="/news/${entry.fields.日時}.html">
      <h2>${entry.fields.タイトル}</h2>
      <p>${entry.fields.日時}</p>
      <p>${entry.fields.カテゴリー}</p>
      <img src="${entry.fields.画像.fields.file.url}" alt="${entry.fields.タイトル}">
      <p>${entry.fields.本文}</p>
    </a>
  `).join('');

  const dateList = entries.map(entry => entry.fields.日時).join(', ');

  const newsSection = `
    ${newsItems}
    <p>日時リスト: ${dateList}</p>
  `;

  newsListHtml = newsListHtml.replace('<!-- NEWS_PLACEHOLDER -->', newsSection);
  await fs.writeFile('public/news.html', newsListHtml);
}

// 個別の記事ページを生成する非同期関数
async function generateArticlePages(entries) {
  const articleTemplate = await fs.readFile('src/templates/article.html', 'utf-8');
  const dateList = entries.map(entry => entry.fields.日時).join(', ');

  for (const entry of entries) {
    let articleHtml = articleTemplate;
    const articleContent = `
      <h1>${entry.fields.タイトル}</h1>
      <p>${entry.fields.日時}</p>
      <p>${entry.fields.カテゴリー}</p>
      <img src="${entry.fields.画像.fields.file.url}" alt="${entry.fields.タイトル}">
      <p>${entry.fields.本文}</p>
      <p>日時リスト: ${dateList}</p>
    `;

    articleHtml = articleHtml.replace('<!-- NEWS_PLACEHOLDER -->', articleContent);
    await fs.writeFile(`public/news/${entry.fields.日時}.html`, articleHtml);
  }
}

// サイトのビルドを開始し、エラーがあればコンソールに出力
buildSite().catch(console.error);
