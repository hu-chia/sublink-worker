import { describe, it, expect } from 'vitest';
import { SurgeConfigBuilder } from '../src/builders/SurgeConfigBuilder.js';

/**
 * Test for Surge [Host] section support
 *
 * Users can customize [Host] section in Base Config Settings,
 * which should be preserved in the output.
 */
describe('Surge [Host] section support', () => {
    const surgeIniWithHost = `[General]
dns-server = 8.8.8.8

[Host]
localhost = 127.0.0.1
example.com = 192.168.1.1
*.test.com = 10.0.0.1

[Proxy]
TestNode = ss, server.com, 443, encrypt-method=aes-256-gcm, password=test

[Rule]
FINAL,PROXY`;

    it('should parse [Host] section from Surge INI input', async () => {
        const builder = new SurgeConfigBuilder(
            surgeIniWithHost,
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        await builder.build();

        // Check that host config was parsed
        expect(builder.config.host).toBeDefined();
        expect(Array.isArray(builder.config.host)).toBe(true);
        expect(builder.config.host.length).toBe(3);
        expect(builder.config.host[0]).toContain('localhost');
        expect(builder.config.host[1]).toContain('example.com');
        expect(builder.config.host[2]).toContain('*.test.com');
    });

    it('should output [Host] section in final config', async () => {
        const builder = new SurgeConfigBuilder(
            surgeIniWithHost,
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        const result = await builder.build();

        // Check [Host] section is present
        expect(result).toContain('[Host]');
        expect(result).toContain('localhost = 127.0.0.1');
        expect(result).toContain('example.com = 192.168.1.1');
        expect(result).toContain('*.test.com = 10.0.0.1');
    });

    it('should place [Host] section after [General]', async () => {
        const builder = new SurgeConfigBuilder(
            surgeIniWithHost,
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        const result = await builder.build();

        // Check order: [General] before [Host]
        const generalIndex = result.indexOf('[General]');
        const hostIndex = result.indexOf('[Host]');

        expect(generalIndex).toBeGreaterThan(-1);
        expect(hostIndex).toBeGreaterThan(-1);
        expect(hostIndex).toBeGreaterThan(generalIndex);
    });

    it('should handle input without [Host] section', async () => {
        const surgeIniNoHost = `[General]
dns-server = 8.8.8.8

[Proxy]
TestNode = ss, server.com, 443, encrypt-method=aes-256-gcm, password=test`;

        const builder = new SurgeConfigBuilder(
            surgeIniNoHost,
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        const result = await builder.build();

        // Should not contain [Host] section if not provided
        expect(result).not.toContain('[Host]');
    });

    it('should handle [Host] with JSON input config', async () => {
        const jsonConfig = {
            general: {
                'dns-server': '8.8.8.8'
            },
            host: [
                'localhost = 127.0.0.1',
                'example.com = 192.168.1.1'
            ],
            proxies: []
        };

        const builder = new SurgeConfigBuilder(
            JSON.stringify(jsonConfig),
            'minimal',
            [],
            null,
            'zh-CN',
            null,
            false
        );

        const result = await builder.build();

        expect(result).toContain('[Host]');
        expect(result).toContain('localhost = 127.0.0.1');
        expect(result).toContain('example.com = 192.168.1.1');
    });
});