// @flow
import { v4 as Uuidv4 } from 'uuid';
import { SHOW_ADS, AD_KEYWORD_BLOCKLIST, AD_KEYWORD_BLOCKLIST_CHECK_DESCRIPTION } from 'config';
import React from 'react';
import ClaimList from 'component/claimList';
import ClaimListDiscover from 'component/claimListDiscover';
import Ads from 'web/component/ads';
import Card from 'component/common/card';
import { useIsMobile, useIsMediumScreen } from 'effects/use-screensize';
import Button from 'component/button';
import { FYP_ID } from 'constants/urlParams';
import classnames from 'classnames';
import RecSys from 'recsys';

const VIEW_ALL_RELATED = 'view_all_related';
const VIEW_MORE_FROM = 'view_more_from';

type Props = {
  uri: string,
  recommendedContentUris: Array<string>,
  nextRecommendedUri: string,
  isSearching: boolean,
  doFetchRecommendedContent: (string, ?FypParam) => void,
  isAuthenticated: boolean,
  claim: ?StreamClaim,
  claimId: string,
  metadata: any,
  location: UrlLocation,
};

export default React.memo<Props>(function RecommendedContent(props: Props) {
  const {
    uri,
    doFetchRecommendedContent,
    recommendedContentUris,
    nextRecommendedUri,
    isSearching,
    isAuthenticated,
    claim,
    claimId,
    metadata,
    location,
  } = props;

  let { description, title } = metadata;

  if (description) {
    description = description.toLowerCase();
  }

  if (title) {
    title = title.toLowerCase();
  }

  let claimNameToCheckAgainst;
  if (claim) {
    claimNameToCheckAgainst = claim.name && claim.name.toLowerCase();
  }

  const checkDescriptionForBlacklistWords = AD_KEYWORD_BLOCKLIST_CHECK_DESCRIPTION === 'true';

  let triggerBlacklist = false;
  if (AD_KEYWORD_BLOCKLIST) {
    const termsToCheck = AD_KEYWORD_BLOCKLIST.toLowerCase().split(',');
    // eslint-disable-next-line no-unused-vars

    if (title) {
      for (const term of termsToCheck) {
        if (claimNameToCheckAgainst && claimNameToCheckAgainst.includes(term)) {
          triggerBlacklist = true;
        }
        if (title.includes(term)) {
          triggerBlacklist = true;
        }
        if (description && checkDescriptionForBlacklistWords && description.includes(term)) {
          triggerBlacklist = true;
        }
      }
    }
  }

  const [viewMode, setViewMode] = React.useState(VIEW_ALL_RELATED);
  const signingChannel = claim && claim.signing_channel;
  const channelName = signingChannel ? signingChannel.name : null;
  const isMobile = useIsMobile();
  const isMedium = useIsMediumScreen();
  const { onRecsLoaded: onRecommendationsLoaded, onClickedRecommended: onRecommendationClicked } = RecSys;

  // Assume this component always resides in a page where the `uri` matches
  // e.g. never in a floating popup. With that, we can grab the FYP ID from
  // the search param directly. Otherwise, the parent component would need to
  // pass it.
  const { search } = location;
  const urlParams = new URLSearchParams(search);
  const fypId = urlParams.get(FYP_ID);
  const [uuid] = React.useState(fypId ? Uuidv4() : '');

  React.useEffect(() => {
    const fypParam = fypId && uuid ? { gid: fypId, uuid } : null;
    doFetchRecommendedContent(uri, fypParam);
  }, [uri, doFetchRecommendedContent, fypId, uuid]);

  React.useEffect(() => {
    // Right now we only want to record the recs if they actually saw them.
    if (
      recommendedContentUris &&
      recommendedContentUris.length &&
      nextRecommendedUri &&
      viewMode === VIEW_ALL_RELATED
    ) {
      onRecommendationsLoaded(claimId, recommendedContentUris, uuid);
    }
  }, [recommendedContentUris, onRecommendationsLoaded, claimId, nextRecommendedUri, viewMode, uuid]);

  function handleRecommendationClicked(e, clickedClaim) {
    if (claim) {
      onRecommendationClicked(claim.claim_id, clickedClaim.claim_id);
    }
  }

  return (
    <Card
      isBodyList
      smallTitle={!isMobile && !isMedium}
      className="file-page__recommended"
      title={__('Related')}
      titleActions={
        signingChannel && (
          <div className="recommended-content__toggles">
            <Button
              className={classnames('button-toggle', {
                'button-toggle--active': viewMode === VIEW_ALL_RELATED,
              })}
              label={__('All')}
              onClick={() => setViewMode(VIEW_ALL_RELATED)}
            />

            <Button
              className={classnames('button-toggle', {
                'button-toggle--active': viewMode === VIEW_MORE_FROM,
              })}
              label={__('More from %claim_name%', { claim_name: channelName })}
              onClick={() => setViewMode(VIEW_MORE_FROM)}
            />
          </div>
        )
      }
      body={
        <div>
          {viewMode === VIEW_ALL_RELATED && (
            <ClaimList
              type="small"
              loading={isSearching}
              uris={recommendedContentUris}
              hideMenu={isMobile}
              injectedItem={
                SHOW_ADS &&
                IS_WEB &&
                !isAuthenticated && <Ads small type={'video'} triggerBlacklist={triggerBlacklist} />
              }
              empty={__('No related content found')}
              onClick={handleRecommendationClicked}
            />
          )}
          {viewMode === VIEW_MORE_FROM && signingChannel && (
            <ClaimListDiscover
              hideAdvancedFilter
              tileLayout={false}
              showHeader={false}
              type="small"
              claimType={['stream']}
              orderBy="new"
              pageSize={20}
              infiniteScroll={false}
              hideFilters
              channelIds={[signingChannel.claim_id]}
              loading={isSearching}
              hideMenu={isMobile}
              injectedItem={SHOW_ADS && IS_WEB && !isAuthenticated && <Ads small type={'video'} />}
              empty={__('No related content found')}
            />
          )}
        </div>
      }
    />
  );
}, areEqual);

function areEqual(prevProps: Props, nextProps: Props) {
  const a = prevProps;
  const b = nextProps;

  if (
    a.uri !== b.uri ||
    a.nextRecommendedUri !== b.nextRecommendedUri ||
    a.isAuthenticated !== b.isAuthenticated ||
    a.isSearching !== b.isSearching ||
    (a.recommendedContentUris && !b.recommendedContentUris) ||
    (!a.recommendedContentUris && b.recommendedContentUris) ||
    (a.claim && !b.claim) ||
    (!a.claim && b.claim)
  ) {
    return false;
  }

  if (a.claim && b.claim && a.claim.claim_id !== b.claim.claim_id) {
    return false;
  }

  if (a.recommendedContentUris && b.recommendedContentUris) {
    if (a.recommendedContentUris.length !== b.recommendedContentUris.length) {
      return false;
    }

    let i = a.recommendedContentUris.length;
    while (i--) {
      if (a.recommendedContentUris[i] !== b.recommendedContentUris[i]) {
        return false;
      }
    }
  }

  return true;
}
