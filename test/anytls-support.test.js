import { describe, it, expect } from 'vitest';
import { SurgeConfigBuilder } from '../src/builders/SurgeConfigBuilder.js';
import { convertSurgeProxyToObject } from '../src/parsers/convertSurgeProxyToObject.js';
import { convertYamlProxyToObject } from '../src/parsers/convertYamlProxyToObject.js';

/**
 * Test for anytls protocol support in Surge
 *
 * Surge supports anytls protocol, so it should not be filtered out
 * as an unsupported proxy type.
 */
describe('anytls protocol support in Surge', () => {
    describe('Surge proxy line parsing', () => {
        it('should parse basic anytls proxy line', () => {
            const line = 'Test-Anytls = anytls, server.example.com, 443, password=test123';
            const result = convertSurgeProxyToObject(line);

            expect(result).not.toBeNull();
            expect(result.type).toBe('anytls');
            expect(result.tag).toBe('Test-Anytls');
            expect(result.server).toBe('server.example.com');
            expect(result.server_port).toBe(443);
            expect(result.password).toBe('test123');
        });

        it('should parse anytls with TLS options', () => {
            const line = 'Test-Anytls = anytls, server.example.com, 443, password=test123, sni=custom.sni.com, skip-cert-verify=true, alpn=h3';
            const result = convertSurgeProxyToObject(line);

            expect(result).not.toBeNull();
            expect(result.type).toBe('anytls');
            expect(result.tls.enabled).toBe(true);
            expect(result.tls.server_name).toBe('custom.sni.com');
            expect(result.tls.insecure).toBe(true);
            expect(result.tls.alpn).toEqual(['h3']);
        });

        it('should parse anytls with client-fingerprint', () => {
            const line = 'Test-Anytls = anytls, server.example.com, 443, password=test123, client-fingerprint=chrome';
            const result = convertSurgeProxyToObject(line);

            expect(result).not.toBeNull();
            expect(result.tls.utls.enabled).toBe(true);
            expect(result.tls.utls.fingerprint).toBe('chrome');
        });

        it('should parse anytls with idle-session options', () => {
            const line = 'Test-Anytls = anytls, server.example.com, 443, password=test123, idle-session-check-interval=30, idle-session-timeout=60, min-idle-session=5';
            const result = convertSurgeProxyToObject(line);

            expect(result).not.toBeNull();
            expect(result['idle-session-check-interval']).toBe(30);
            expect(result['idle-session-timeout']).toBe(60);
            expect(result['min-idle-session']).toBe(5);
        });
    });

    describe('Clash YAML proxy parsing', () => {
        it('should parse anytls from Clash YAML format', () => {
            const proxy = {
                name: 'Test-Anytls',
                type: 'anytls',
                server: 'server.example.com',
                port: 443,
                password: 'test123',
                sni: 'custom.sni.com',
                'skip-cert-verify': true,
                alpn: ['h3'],
                'client-fingerprint': 'chrome'
            };
            const result = convertYamlProxyToObject(proxy);

            expect(result).not.toBeNull();
            expect(result.type).toBe('anytls');
            expect(result.tag).toBe('Test-Anytls');
            expect(result.server).toBe('server.example.com');
            expect(result.server_port).toBe(443);
            expect(result.password).toBe('test123');
            expect(result.tls.server_name).toBe('custom.sni.com');
            expect(result.tls.insecure).toBe(true);
            expect(result.tls.alpn).toEqual(['h3']);
            expect(result.tls.utls.enabled).toBe(true);
            expect(result.tls.utls.fingerprint).toBe('chrome');
        });
    });

    describe('Surge config output', () => {
        it('should output anytls proxy correctly', async () => {
            // Input anytls URI (from Clash format since no URI scheme exists)
            const clashYamlInput = `proxies:
  - name: Test-Anytls
    type: anytls
    server: server.example.com
    port: 443
    password: test123
    sni: custom.sni.com`;

            const builder = new SurgeConfigBuilder(
                clashYamlInput,
                'minimal',
                [],
                null,
                'zh-CN',
                null,
                false
            );

            const result = await builder.build();

            // Should contain anytls proxy in [Proxy] section (not commented)
            expect(result).toContain('Test-Anytls = anytls, server.example.com, 443, password=test123');
            expect(result).toContain('sni=custom.sni.com');

            // Should NOT contain "Unsupported proxy type" comment
            expect(result).not.toContain('# Test-Anytls - Unsupported proxy type');
        });

        it('should include anytls proxy in proxy groups', async () => {
            const clashYamlInput = `proxies:
  - name: Anytls-Node
    type: anytls
    server: server.example.com
    port: 443
    password: test123`;

            const builder = new SurgeConfigBuilder(
                clashYamlInput,
                'minimal',
                [],
                null,
                'zh-CN',
                null,
                false
            );

            const result = await builder.build();

            // Extract [Proxy Group] section
            const proxyGroupMatch = result.match(/\[Proxy Group\]([\s\S]*?)(?=\n\[|$)/);
            expect(proxyGroupMatch).not.toBeNull();

            const proxyGroupSection = proxyGroupMatch[1];

            // Should contain the anytls proxy name in groups
            expect(proxyGroupSection).toContain('Anytls-Node');
        });

        it('should output all anytls options correctly', async () => {
            const clashYamlInput = `proxies:
  - name: Full-Anytls
    type: anytls
    server: server.example.com
    port: 443
    password: test123
    sni: custom.sni.com
    skip-cert-verify: true
    alpn:
      - h3
    client-fingerprint: chrome
    idle-session-check-interval: 30
    idle-session-timeout: 60
    min-idle-session: 5`;

            const builder = new SurgeConfigBuilder(
                clashYamlInput,
                'minimal',
                [],
                null,
                'zh-CN',
                null,
                false
            );

            const result = await builder.build();

            // Verify all options are present in output
            expect(result).toContain('Full-Anytls = anytls, server.example.com, 443, password=test123');
            expect(result).toContain('sni=custom.sni.com');
            expect(result).toContain('skip-cert-verify=true');
            expect(result).toContain('alpn=h3');
            expect(result).toContain('client-fingerprint=chrome');
            expect(result).toContain('idle-session-check-interval=30');
            expect(result).toContain('idle-session-timeout=60');
            expect(result).toContain('min-idle-session=5');
        });
    });
});