import typescript from 'rollup-plugin-typescript2';
import dts from 'rollup-plugin-dts';

export default [
    {
        input: 'src/index.ts',
        output: [
            {
                file: 'dist/index.js',
                format: 'cjs'
            },
            {
                file: 'dist/index.esm.js',
                format: 'es'
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
        input: 'src/index.ts',
        output: [{ file: 'dist/index.d.ts', format: 'es' }],
        plugins: [dts()]
    }
]; 