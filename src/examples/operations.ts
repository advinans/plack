import plack from '../';

function main() {
  const op1 = plack().operation({ id: 'abcl', producer: 'abc' });

  op1.info({ first: true }, 'start!');
  op1.info('go!');
  op1.info('go!');
  op1.info({ last: true }, 'ok!');
}

main();
