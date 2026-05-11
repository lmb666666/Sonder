// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const repositoryOwner = process.env.GITHUB_REPOSITORY_OWNER;
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isProjectPage =
    Boolean(repositoryOwner) &&
    Boolean(repositoryName) &&
    repositoryName !== `${repositoryOwner}.github.io`;

const githubPagesSite =
    repositoryOwner && repositoryName
        ? `https://${repositoryOwner}.github.io${isProjectPage ? `/${repositoryName}` : ''}`
        : undefined;

// https://astro.build/config
export default defineConfig({
    site: isGitHubActions && githubPagesSite ? githubPagesSite : 'https://example.com',
    base: isGitHubActions && isProjectPage && repositoryName ? `/${repositoryName}` : '/',
    integrations: [mdx(), sitemap()],

    fonts: [
        {
            provider: fontProviders.local(),
            name: 'Atkinson',
            cssVariable: '--font-atkinson',
            fallbacks: ['sans-serif'],
            options: {
                variants: [
                    {
                        src: ['./src/assets/fonts/atkinson-regular.woff'],
                        weight: 400,
                        style: 'normal',
                        display: 'swap',
                    },
                    {
                        src: ['./src/assets/fonts/atkinson-bold.woff'],
                        weight: 700,
                        style: 'normal',
                        display: 'swap',
                    },
                ],
            },
        },
    ],

    vite: {
        plugins: [tailwindcss()],
    },
});