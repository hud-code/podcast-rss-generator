import { NextRequest } from 'next/server';
import { load } from 'cheerio';
import rss from 'rss';

export const revalidate = 3600;
// this empty generateStaticParams is necessary to make revalidate work
export function generateStaticParams() {
  return [];
}

const SELF_URL = process.env.SELF_URL;

export const GET = async (_req: NextRequest, { params }: { params: { id: string }; }) => {
  console.log('Generate Xiaoyuzhou RSS for podcast id:', params.id);

  const link = `https://www.xiaoyuzhoufm.com/podcast/${params.id}`;

  const res = await fetch(link, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    },
  });

  if (!res.ok) {
    return new Response(null, {
      status: res.status,
      statusText: res.statusText,
    });
  }

  const html = await res.text();

  const $ = load(html);

  const pageData = JSON.parse($('#__NEXT_DATA__').contents().first().text());

  const episodes: {
    title: string;
    enclosureUrl: string;
    itunesDuration: number;
    enclosureType: string;
    link: string;
    pubDate: Date;
    description: string;
    itunesItemImage: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }[] = pageData.props.pageProps.podcast.episodes.map((item: any) => ({
      title: item.title,
      enclosureUrl: item.enclosure.url,
      itunesDuration: item.duration,
      enclosureType: 'audio/mpeg',
      link: `https://www.xiaoyuzhoufm.com/episode/${item.eid}`,
      pubDate: new Date(item.pubDate),
      description: item.shownotes,
      itunesItemImage: (item.image || item.podcast?.image)?.middlePicUrl,
  }));

  const podcast = {
    title: pageData.props.pageProps.podcast.title,
    link,
    itunesAuthor: pageData.props.pageProps.podcast.author,
    itunesCategory: '',
    image: pageData.props.pageProps.podcast.image.middlePicUrl,
    description: pageData.props.pageProps.podcast.description,
  };

  const feed = new rss({
    title: podcast.title,
    description: podcast.description ?? undefined,
    feed_url: `${SELF_URL}/rss/xyz/${params.id}`,
    site_url: link,
    generator: 'Podwise',
    image_url: podcast.image ?? undefined,
    pubDate: episodes[0].pubDate,
    ttl: 3600,
    custom_namespaces: {
      'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd'
    },
    custom_elements: [
      { 'itunes:author': podcast.itunesAuthor ?? undefined },
      { 'itunes:image': { _attr: { href: podcast.image ?? undefined } } },
      { 'itunes:subtitle': podcast.description ?? undefined },
      { 'itunes:summary': podcast.description ?? undefined },
    ],
  });

  episodes.forEach((episode) => {
    feed.item({
      title: episode.title,
      description: episode.description,
      url: episode.link,
      date: episode.pubDate,
      enclosure: {
        url: episode.enclosureUrl,
        type: episode.enclosureType,
      },
      custom_elements: [
        { 'itunes:duration': episode.itunesDuration },
        { 'itunes:image': { _attr: { href: episode.itunesItemImage ?? undefined } } },
      ],
    });
  });

  return new Response(feed.xml({ indent: true }), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
