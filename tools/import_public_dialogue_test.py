import copy
import unittest
from import_public_dialogue import BAD_LABELS, make_pairs, permitted_url, reason, split_for


class ImportTests(unittest.TestCase):
    def message(self):
        labels = {k: {'value': 0} for k in BAD_LABELS}
        labels.update(quality={'value': .8}, toxicity={'value': 0})
        return {'lang': 'en', 'deleted': False, 'review_result': True,
                'synthetic': False, 'labels': labels, 'text': 'Would you like to draw a friendly cloud?'}

    def test_quality_and_privacy(self):
        msg = self.message()
        self.assertIsNone(reason(msg))
        for key in BAD_LABELS:
            changed = copy.deepcopy(msg)
            changed['labels'][key]['value'] = .1
            self.assertIsNotNone(reason(changed))
        for text in ['Write to test@example.invalid for a cloud.', 'My name is Placeholder.',
                     'Please use account 123456789 for a cloud.', 'Look at https://example.invalid for a cloud.']:
            self.assertIsNotNone(reason({**msg, 'text': text}))
        self.assertIsNotNone(reason({**msg, 'synthetic': True}))
        self.assertIsNotNone(reason({**msg, 'labels': {}}))
        self.assertIsNotNone(reason({**msg, 'lang': 'de'}))

    def test_grouping_dedup_and_order(self):
        messages = {}
        for i in range(40):
            parent = {'message_id': f'p{i}', 'parent_id': None, 'tree_id': f'tree{i//2}',
                      'role': 'prompter', 'text': f'Invent a cloud number {i} please.'}
            reply = {'message_id': f'a{i}', 'parent_id': f'p{i}', 'tree_id': parent['tree_id'],
                     'role': 'assistant', 'text': f'Here is cloud number {i} for you.', 'rank': 0}
            messages[parent['message_id']] = parent
            messages[reply['message_id']] = reply
        messages['duplicate'] = {**messages['a0'], 'message_id': 'duplicate'}
        result = make_pairs(messages)
        self.assertEqual(sum(map(len, result.values())), 40)
        self.assertEqual(result, make_pairs(dict(reversed(list(messages.items())))))
        trees = {k: {p['conversation_id'] for p in v} for k, v in result.items()}
        for a in trees:
            for b in trees:
                if a != b:
                    self.assertFalse(trees[a] & trees[b])
        for split, pairs in result.items():
            for p in pairs:
                self.assertEqual(split, split_for(p['conversation_id']))
                self.assertNotIn('user_id', p)
        self.assertEqual(sum(map(len, make_pairs(messages, limit=7).values())), 7)

    def test_download_hosts(self):
        self.assertTrue(permitted_url('https://huggingface.co/datasets/example'))
        self.assertTrue(permitted_url('https://cas-bridge.xethub.hf.co/example'))
        self.assertFalse(permitted_url('http://huggingface.co/example'))
        self.assertFalse(permitted_url('https://huggingface.co.example.invalid/file'))


if __name__ == '__main__':
    unittest.main()
