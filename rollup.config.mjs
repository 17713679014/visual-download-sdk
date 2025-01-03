import typescript from 'rollup-plugin-typescript2';
import dts from 'rollup-plugin-dts';

export default [
    {
        input: './src/index.ts',
        output: [
            {
                file: './src/dist/index.js',
                format: 'cjs',
                exports: 'named'
            },
            {
                file: './src/dist/index.esm.js',
                format: 'es',
                exports: 'named'
            }
        ],
        plugins: [
            typescript({
                tsconfig: './tsconfig.json',
                clean: true
            })
        ],
        external: ['axios', 'idb']
    },
    {
        input: './src/index.ts',
        output: [{ file: './src/dist/index.d.ts', format: 'es' }],
        plugins: [dts()]
    }
]; 