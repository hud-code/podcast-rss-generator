import type { GetStaticProps, GetStaticPaths } from "next"
import type { NextApiResponse } from "next"
import RSS from "rss"
import { requestNextData } from "@/app/xyz-tools"

const SELF_URL = process.env.SELF_URL

interface Episode {
  title: string
  enclosureUrl: string
  itunesDuration: number
  enclosureType: string
  link: string
  pubDate: string
  description: string
  itunesItemImage: string | undefined
  isPrivateMedia: boolean
}

interface Podcast {
  title: string
  link: string
  itunesAuthor: string
  itunesCategory: string
  image: string
  description: string
}

interface Props {
  podcast: Podcast
  episodes: Episode[]
  id: string
}

export const getStaticPaths: GetStaticPaths = async () => {
  // You might want to pre-render some popular podcast IDs here
  return {
    paths: [],
    fallback: "blocking",
  }
}

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const id = params?.id as string
  const link = `https://www.xiaoyuzhoufm.com/podcast/${id}`

  try {
    const res = await requestNextData(link)

    if (!res.ok) {
      return { notFound: true }
    }

    const pageData = res.data as any

    const podcast: Podcast = {
      title: pageData.props.pageProps.podcast.title,
      link,
      itunesAuthor: pageData.props.pageProps.podcast.author,
      itunesCategory: "",
      image: pageData.props.pageProps.podcast.image.middlePicUrl,
      description: pageData.props.pageProps.podcast.description,
    }

    const episodes: Episode[] = pageData.props.pageProps.podcast.episodes.map((item: any) => ({
      title: item.title,
      enclosureUrl: item.enclosure.url,
      itunesDuration: item.duration,
      enclosureType: "audio/mpeg",
      link: `https://www.xiaoyuzhoufm.com/episode/${item.eid}`,
      pubDate: new Date(item.pubDate).toUTCString(),
      description: item.shownotes,
      itunesItemImage: (item.image || item.podcast?.image)?.middlePicUrl,
      isPrivateMedia: item.isPrivateMedia ?? false,
    }))

    return {
      props: {
        podcast,
        episodes,
        id,
      },
      revalidate: 3600, // Revalidate every hour
    }
  } catch (error) {
    console.error("Error fetching podcast data:", error)
    return { notFound: true }
  }
}

export default function PodcastRSS({ podcast, episodes, id }: Props) {
  const feed = new RSS({
    title: podcast.title,
    description: podcast.description ?? undefined,
    feed_url: `${SELF_URL}/rss/xyz/${id}`,
    site_url: podcast.link,
    generator: "Podwise",
    image_url: podcast.image ?? undefined,
    pubDate: episodes[0]?.pubDate,
    ttl: 3600,
    custom_namespaces: {
      itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd",
    },
    custom_elements: [
      { "itunes:author": podcast.itunesAuthor ?? undefined },
      { "itunes:image": { _attr: { href: podcast.image ?? undefined } } },
      { "itunes:subtitle": podcast.description ?? undefined },
      { "itunes:summary": podcast.description ?? undefined },
    ],
  })

  episodes.forEach((episode) => {
    if (episode.isPrivateMedia) {
      return
    }
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
        { "itunes:duration": episode.itunesDuration },
        { "itunes:image": { _attr: { href: episode.itunesItemImage ?? undefined } } },
      ],
    })
  })

  return feed.xml({ indent: true })
}

export const config = {
  api: {
    responseLimit: false,
  },
}

// This is needed to set the correct content type for the RSS feed
export function getServerSideProps({ res }: { res: NextApiResponse }) {
  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8")
  return { props: {} }
}
