import { PrismaClient, CatalystType, Novelty } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const newsEvents = [
    {
      ticker: 'ADA',
      catalystType: CatalystType.PARTNERSHIP,
      headline: 'Cardano Announces Strategic Partnership',
      summary: 'Cardano Foundation partners with a major institution to drive enterprise adoption of the ADA blockchain.',
      novelty: Novelty.NEW,
      confirmingSignal: true,
      score: 85.5,
      sourceUrl: 'https://example.com/news/1'
    },
    {
      ticker: 'XLM',
      catalystType: CatalystType.PROTOCOL_UPGRADE,
      headline: 'Stellar Lumens Protocol V20 Live',
      summary: 'The Stellar network has successfully completed its latest protocol upgrade, introducing smart contracts.',
      novelty: Novelty.RECYCLED,
      confirmingSignal: false,
      score: 75.0,
      sourceUrl: 'https://example.com/news/2'
    },
    {
      ticker: 'AAVE',
      catalystType: CatalystType.INSTITUTIONAL_ADOPTION,
      headline: 'Major Bank Integrates AAVE Liquidity Pools',
      summary: 'A leading global bank has started offering DeFi yields to its clients using AAVE protocols.',
      novelty: Novelty.NEW,
      confirmingSignal: true,
      score: 65.0,
      sourceUrl: 'https://example.com/news/3'
    },
    {
      ticker: 'SEI',
      catalystType: CatalystType.NETWORK_ACTIVITY,
      headline: 'SEI Network Sees Surge in Transaction Volume',
      summary: 'Trading activity on SEI has reached an all-time high over the past 24 hours.',
      novelty: Novelty.RECYCLED,
      confirmingSignal: false,
      score: 45.5,
      sourceUrl: 'https://example.com/news/4'
    },
    {
      ticker: 'QNT',
      catalystType: CatalystType.MARKET_WIDE,
      headline: 'Quant Network Mentioned in Central Bank Report',
      summary: 'QNT featured prominently in a new research paper published by a consortium of central banks.',
      novelty: Novelty.NEW,
      confirmingSignal: true,
      score: 35.0,
      sourceUrl: 'https://example.com/news/5'
    },
    {
      ticker: 'JST',
      catalystType: CatalystType.PARTNERSHIP,
      headline: 'JUST Token Added to New DeFi Aggregator',
      summary: 'JST is now supported on a newly launched cross-chain yield aggregator platform.',
      novelty: Novelty.RECYCLED,
      confirmingSignal: false,
      score: 25.0,
      sourceUrl: 'https://example.com/news/6'
    },
    {
      ticker: 'SOL',
      catalystType: CatalystType.PROTOCOL_UPGRADE,
      headline: 'Solana Releases Validator Client Update',
      summary: 'A new update aims to improve network stability and reduce congestion during peak loads.',
      novelty: Novelty.NEW,
      confirmingSignal: true,
      score: 55.0,
      sourceUrl: 'https://example.com/news/7'
    },
    {
      ticker: 'DOGE',
      catalystType: CatalystType.MARKET_WIDE,
      headline: 'Dogecoin Mentioned in Viral Tech Interview',
      summary: 'A prominent tech CEO casually mentioned DOGE, sparking renewed retail interest.',
      novelty: Novelty.RECYCLED,
      confirmingSignal: true,
      score: 90.0,
      sourceUrl: 'https://example.com/news/8'
    }
  ];

  console.log('Seeding NewsEvents...');
  for (const event of newsEvents) {
    await prisma.newsEvent.upsert({
      where: {
        ticker_createdAt: {
          ticker: event.ticker,
          createdAt: new Date()
        }
      },
      update: {},
      create: event
    });
  }
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
